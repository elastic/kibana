/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import {
  BATCHED_CUSTOM_MARKER_OWNER,
  filterHighlightableValidationResults,
  type YamlValidationResult,
} from '@kbn/workflows-yaml';
import type { z } from '@kbn/zod/v4';
import { getStepSourceRange } from './yaml_mutations';
import type { ComputedData } from '../../../entities/workflows/store/workflow_detail/types';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';
import {
  createStepFragmentModelUri,
  registerStepFragmentModel,
  type StepFragmentTarget,
} from '../../../widgets/workflow_yaml_editor/lib/step_fragment/step_fragment_models';
import {
  buildStepFragmentVirtualYaml,
  mapValidationResultsToFragment,
  type StepFragmentVirtualYaml,
} from '../../../widgets/workflow_yaml_editor/lib/step_fragment/step_fragment_virtual_yaml';
import {
  collectYamlSchemaValidationResults,
  mergeWorkflowYamlValidationResults,
} from '../../change_history/collect_yaml_schema_validation_results';
import {
  collectFullWorkflowYamlValidationResults,
  type WorkflowYamlValidationContext,
} from '../../validate_workflow_yaml/lib/collect_full_workflow_yaml_validation_results';
import { createMarkersAndDecorations } from '../../validate_workflow_yaml/lib/create_yaml_validation_markers_and_decorations';

// Matches the main editor's `workflowComputationMiddleware` debounce (see
// `entities/workflows/store/workflow_detail/middleware.ts`).
const VALIDATION_DEBOUNCE_MS = 250;

export interface StepFragmentYamlSupportInputs {
  readonly workflowYaml: string;
  readonly stepName: string | undefined;
  readonly workflowZodSchema: z.ZodSchema;
  readonly validationContext: WorkflowYamlValidationContext;
}

export interface StepFragmentYamlSupportHandle {
  /** Re-runs validation against the latest `getInputs()` snapshot. */
  readonly revalidate: () => void;
  readonly dispose: () => void;
}

/** The subset of `IStandaloneCodeEditor` this module needs — kept narrow so it's easy to fake in tests. */
export type StepFragmentYamlSupportEditor = Pick<
  monaco.editor.IStandaloneCodeEditor,
  'getModel' | 'setModel' | 'onDidDispose'
>;

/**
 * Wires a step-fragment `CodeEditor` (de-indented step YAML) so it validates
 * and autocompletes as if it were still nested inside the full workflow YAML:
 *
 * 1. Swaps the editor's model for one with a step-fragment URI, excluded from
 *    the full-workflow JSON schema (see `STEP_FRAGMENT_SCHEMA_FILE_MATCH_EXCLUSION`).
 * 2. Keeps a hidden "shadow" model holding the full workflow YAML with the
 *    live fragment text spliced back into the step's original position.
 *    monaco-yaml validates and autocompletes that model normally.
 * 3. Registers the fragment model so the global completion provider (and this
 *    module's own validation pass) can resolve its shadow target.
 * 4. Runs the same custom + schema validation pipeline as the main editor
 *    against the shadow model, maps results back to fragment coordinates,
 *    and publishes them as markers on the fragment model.
 */
export const attachStepFragmentYamlSupport = (
  editor: StepFragmentYamlSupportEditor,
  getInputs: () => StepFragmentYamlSupportInputs
): StepFragmentYamlSupportHandle => {
  const originalModel = editor.getModel();
  const fragmentModel = monaco.editor.createModel(
    originalModel?.getValue() ?? '',
    YAML_LANG_ID,
    createStepFragmentModelUri()
  );
  editor.setModel(fragmentModel);
  originalModel?.dispose();

  const shadowModel = monaco.editor.createModel('', YAML_LANG_ID);

  let isDisposed = false;
  let lastVirtualYaml: string | undefined;
  let lastComputed: ComputedData | undefined;
  let abortController: AbortController | undefined;

  /** Memoized on the virtual YAML text: only re-parses/re-computes when it actually changed. */
  const resolveTarget = (): StepFragmentTarget | undefined => {
    const { workflowYaml, stepName } = getInputs();
    if (!stepName) return undefined;
    const stepRange = getStepSourceRange(workflowYaml, stepName);
    if (!stepRange) return undefined;
    const virtual = buildStepFragmentVirtualYaml(workflowYaml, stepRange, fragmentModel.getValue());
    if (virtual.yaml !== lastVirtualYaml || !lastComputed) {
      lastVirtualYaml = virtual.yaml;
      lastComputed = performComputation(virtual.yaml);
      if (shadowModel.getValue() !== virtual.yaml) {
        shadowModel.setValue(virtual.yaml);
      }
    }
    return { model: shadowModel, virtual, computed: lastComputed };
  };

  const registration = registerStepFragmentModel(fragmentModel, resolveTarget);

  const publish = (
    results: readonly YamlValidationResult[],
    virtual: StepFragmentVirtualYaml
  ): void => {
    if (isDisposed) return;
    const { markers } = createMarkersAndDecorations(
      mapValidationResultsToFragment(results, virtual)
    );
    monaco.editor.setModelMarkers(fragmentModel, BATCHED_CUSTOM_MARKER_OWNER, markers);
  };

  const runValidation = async (): Promise<void> => {
    abortController?.abort();
    const target = resolveTarget();
    if (!target) {
      monaco.editor.setModelMarkers(fragmentModel, BATCHED_CUSTOM_MARKER_OWNER, []);
      return;
    }
    const { computed, virtual } = target;
    if (!computed.yamlDocument || !computed.yamlLineCounter) {
      monaco.editor.setModelMarkers(fragmentModel, BATCHED_CUSTOM_MARKER_OWNER, []);
      return;
    }

    const controller = new AbortController();
    abortController = controller;
    const { workflowZodSchema, validationContext } = getInputs();

    try {
      const customResults = await collectFullWorkflowYamlValidationResults({
        yamlString: virtual.yaml,
        model: shadowModel,
        yamlDocument: computed.yamlDocument,
        lineCounter: computed.yamlLineCounter,
        workflowLookup: computed.workflowLookup,
        workflowGraph: computed.workflowGraph,
        workflowDefinition: computed.workflowDefinition ?? undefined,
        graphBuildError: computed.graphBuildError,
        context: { ...validationContext, signal: controller.signal },
      });
      if (controller.signal.aborted || isDisposed) return;

      const schemaResults = collectYamlSchemaValidationResults(
        shadowModel,
        computed.yamlDocument,
        workflowZodSchema
      );
      const merged = mergeWorkflowYamlValidationResults(customResults, schemaResults);
      publish(filterHighlightableValidationResults(merged), virtual);
    } catch {
      if (!controller.signal.aborted && !isDisposed) {
        publish([], virtual);
      }
    }
  };

  const debouncedValidate = debounce(() => void runValidation(), VALIDATION_DEBOUNCE_MS);

  const contentListener = fragmentModel.onDidChangeContent(() => debouncedValidate());
  // monaco-yaml's own ('yaml'-owner) schema markers for the shadow model arrive
  // asynchronously from its worker, after `runValidation` has already read an
  // empty set — re-run once they land so schema errors still show up.
  const markersListener = monaco.editor.onDidChangeMarkers((uris) => {
    if (uris.some((uri) => uri.toString() === shadowModel.uri.toString())) {
      void runValidation();
    }
  });

  void runValidation();

  function dispose(): void {
    if (isDisposed) return;
    isDisposed = true;
    debouncedValidate.cancel();
    abortController?.abort();
    contentListener.dispose();
    markersListener.dispose();
    disposeListener.dispose();
    registration.dispose();
    shadowModel.dispose();
  }

  const disposeListener = editor.onDidDispose(dispose);

  return {
    revalidate: () => void runValidation(),
    dispose,
  };
};
