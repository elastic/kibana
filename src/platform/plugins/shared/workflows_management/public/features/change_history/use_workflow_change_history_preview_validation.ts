/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Change-history preview validation orchestration.
 *
 * Uses the same pipeline as the main workflow YAML editor:
 * `collectFullWorkflowYamlValidationResults` (via `applyWorkflowYamlValidationToEditor`)
 * plus Monaco YAML schema markers, merged with `mergeWorkflowYamlValidationResults`.
 *
 */

import type { SchemasSettings } from 'monaco-yaml';
import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Document } from 'yaml';
import { monaco } from '@kbn/code-editor';
import {
  applyValidationHighlightsToEditor,
  applyWorkflowYamlValidationToEditor,
} from './apply_workflow_yaml_validation_to_editor';
import {
  collectYamlSchemaValidationResults,
  mergeWorkflowYamlValidationResults,
} from './collect_yaml_schema_validation_results';
import {
  getPreviewSchemasFingerprint,
  getYamlOwnerMarkersFingerprint,
  modelHasYamlOwnerMarkers,
} from './preview_yaml_validation_utils';
import { waitForPreviewYamlSchemaMarkers } from './wait_for_yaml_schema_markers_after_update';
import { WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_REUSE_MAX_WAIT_MS } from './workflow_change_history_preview_constants';
import type { WorkflowChangeHistoryCompareMode } from './workflow_change_history_preview_settings_popover';
import { getWorkflowZodSchema } from '../../../common/schema';
import { useAvailableConnectors } from '../../entities/connectors/model/use_available_connectors';
import { triggerSchemas } from '../../trigger_schemas';
import { navigateToErrorPosition } from '../../widgets/workflow_yaml_editor/lib/utils';
import { getWorkflowValidationDisplayOptions } from '../../widgets/workflow_yaml_editor/lib/workflow_monaco_layout_options';
import { useWorkflowYamlValidationContextRef } from '../validate_workflow_yaml/lib/use_workflow_yaml_validation_context';
import {
  validationResultsFingerprint,
  type YamlValidationResult,
} from '../validate_workflow_yaml/model/types';
import { useWorkflowJsonSchema } from '../validate_workflow_yaml/model/use_workflow_json_schema';

export interface UseWorkflowChangeHistoryPreviewValidationParams {
  getActiveEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  validationDecorationsRef: MutableRefObject<monaco.editor.IEditorDecorationsCollection | null>;
  validationYaml: string;
  highlightValidationErrors: boolean;
  isEditorMounted: boolean;
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  diffEditorRef: MutableRefObject<monaco.editor.IStandaloneDiffEditor | null>;
  compareModeRef: MutableRefObject<WorkflowChangeHistoryCompareMode>;
  configureDiffEditors: (
    diffEditor: monaco.editor.IStandaloneDiffEditor,
    compareMode: WorkflowChangeHistoryCompareMode,
    highlightValidationErrors: boolean
  ) => void;
}

export interface UseWorkflowChangeHistoryPreviewValidationResult {
  validationResults: YamlValidationResult[];
  isValidationLoading: boolean;
  handleValidationErrorClick: (error: YamlValidationResult) => void;
}

export const useWorkflowChangeHistoryPreviewValidation = ({
  getActiveEditor,
  validationDecorationsRef,
  validationYaml,
  highlightValidationErrors,
  isEditorMounted,
  editorRef,
  diffEditorRef,
  compareModeRef,
  configureDiffEditors,
}: UseWorkflowChangeHistoryPreviewValidationParams): UseWorkflowChangeHistoryPreviewValidationResult => {
  const [publishedValidationResults, setPublishedValidationResults] = useState<
    YamlValidationResult[]
  >([]);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const isValidationLoadingRef = useRef(false);
  const [hasInitialValidationPass, setHasInitialValidationPass] = useState(false);
  const hasInitialValidationPassRef = useRef(false);
  const customValidationResultsRef = useRef<YamlValidationResult[]>([]);
  const yamlSchemaResultsRef = useRef<YamlValidationResult[]>([]);
  const computedYamlDocumentRef = useRef<Document | null>(null);
  const validationAbortControllerRef = useRef<AbortController | null>(null);
  const lastAppliedHighlightsFingerprintRef = useRef('');
  const lastPublishedYamlFingerprintRef = useRef('');
  const lastYamlMarkersFingerprintRef = useRef('');
  const isApplyingHighlightsRef = useRef(false);
  const wasHighlightEnabledRef = useRef(false);
  const highlightValidationErrorsRef = useRef(highlightValidationErrors);
  highlightValidationErrorsRef.current = highlightValidationErrors;
  const validationYamlRef = useRef(validationYaml);
  validationYamlRef.current = validationYaml;
  const completedInitialPassWithoutYamlSchemaRef = useRef(false);
  const previousValidationYamlRef = useRef(validationYaml);
  const registeredPreviewSchemasFingerprintRef = useRef('');

  const { jsonSchema: workflowJsonSchema, uri: workflowSchemaUri } = useWorkflowJsonSchema({
    loose: false,
  });
  const connectorsData = useAvailableConnectors();
  const validationContextRef = useWorkflowYamlValidationContextRef();
  const workflowZodSchema = useMemo(
    () =>
      getWorkflowZodSchema(connectorsData?.connectorTypes ?? {}, triggerSchemas.getRegisteredIds()),
    [connectorsData?.connectorTypes]
  );
  const workflowZodSchemaRef = useRef(workflowZodSchema);
  workflowZodSchemaRef.current = workflowZodSchema;

  const monacoYamlSchemas = useMemo((): SchemasSettings[] => {
    if (!workflowSchemaUri || !workflowJsonSchema) {
      return [];
    }

    return [
      {
        fileMatch: ['*'],
        schema: workflowJsonSchema as SchemasSettings['schema'],
        uri: workflowSchemaUri,
      },
    ];
  }, [workflowJsonSchema, workflowSchemaUri]);

  const monacoYamlSchemasRef = useRef(monacoYamlSchemas);
  monacoYamlSchemasRef.current = monacoYamlSchemas;

  const publishFooterValidationResults = useCallback(() => {
    setPublishedValidationResults(
      mergeWorkflowYamlValidationResults(
        customValidationResultsRef.current,
        yamlSchemaResultsRef.current
      )
    );
  }, []);

  const beginValidationRun = useCallback(() => {
    isValidationLoadingRef.current = true;
    setIsValidationLoading(true);
    setPublishedValidationResults([]);
  }, []);

  const completeValidationRun = useCallback(() => {
    isValidationLoadingRef.current = false;
    setIsValidationLoading(false);
    publishFooterValidationResults();
  }, [publishFooterValidationResults]);

  const syncValidationDisplay = useCallback(
    (highlight: boolean) => {
      const displayOptions = getWorkflowValidationDisplayOptions(highlight);

      if (editorRef.current) {
        editorRef.current.updateOptions(displayOptions);
      }

      const diffEditor = diffEditorRef.current;
      if (diffEditor) {
        diffEditor.updateOptions(displayOptions);
        configureDiffEditors(diffEditor, compareModeRef.current, highlight);
      }
    },
    [compareModeRef, configureDiffEditors, diffEditorRef, editorRef]
  );

  const clearEditorValidation = useCallback(() => {
    const editor = getActiveEditor();
    if (!editor) {
      return;
    }

    void applyWorkflowYamlValidationToEditor(
      editor,
      validationYaml,
      false,
      validationDecorationsRef,
      undefined,
      { validationContext: validationContextRef.current }
    );
  }, [getActiveEditor, validationContextRef, validationDecorationsRef, validationYaml]);

  const markInitialValidationPassComplete = useCallback((didWaitForYamlSchema: boolean) => {
    completedInitialPassWithoutYamlSchemaRef.current = !didWaitForYamlSchema;
    hasInitialValidationPassRef.current = true;
    setHasInitialValidationPass(true);
  }, []);

  const resetInitialValidationPass = useCallback(() => {
    hasInitialValidationPassRef.current = false;
    setHasInitialValidationPass(false);
  }, []);

  const resetValidationResultsState = useCallback(() => {
    lastAppliedHighlightsFingerprintRef.current = '';
    lastPublishedYamlFingerprintRef.current = '';
    lastYamlMarkersFingerprintRef.current = '';
    customValidationResultsRef.current = [];
    yamlSchemaResultsRef.current = [];
    computedYamlDocumentRef.current = null;
    setPublishedValidationResults([]);
  }, []);

  const applyMergedHighlightsIfNeeded = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      if (!highlightValidationErrorsRef.current) {
        return;
      }

      const mergedResults = mergeWorkflowYamlValidationResults(
        customValidationResultsRef.current,
        yamlSchemaResultsRef.current
      );
      const highlightsFingerprint = validationResultsFingerprint(mergedResults);

      if (highlightsFingerprint === lastAppliedHighlightsFingerprintRef.current) {
        return;
      }

      lastAppliedHighlightsFingerprintRef.current = highlightsFingerprint;
      isApplyingHighlightsRef.current = true;

      try {
        applyValidationHighlightsToEditor(editor, mergedResults, validationDecorationsRef, {
          omitMarginDecorations: true,
        });
      } finally {
        isApplyingHighlightsRef.current = false;
      }
    },
    [validationDecorationsRef]
  );

  const collectYamlSchemaResultsFromModel = useCallback(
    (model: monaco.editor.ITextModel): YamlValidationResult[] => {
      return collectYamlSchemaValidationResults(
        model,
        computedYamlDocumentRef.current,
        workflowZodSchemaRef.current
      );
    },
    []
  );

  const publishYamlSchemaResultsFromModel = useCallback(
    (model: monaco.editor.ITextModel) => {
      if (isApplyingHighlightsRef.current) {
        return;
      }

      try {
        const nextYamlSchemaResults = collectYamlSchemaResultsFromModel(model);
        const nextFingerprint = validationResultsFingerprint(nextYamlSchemaResults);

        if (nextFingerprint !== lastPublishedYamlFingerprintRef.current) {
          lastPublishedYamlFingerprintRef.current = nextFingerprint;
          lastYamlMarkersFingerprintRef.current = getYamlOwnerMarkersFingerprint(model);
          yamlSchemaResultsRef.current = nextYamlSchemaResults;
        }

        const activeEditor = getActiveEditor();
        if (activeEditor) {
          applyMergedHighlightsIfNeeded(activeEditor);
        }

        if (!isValidationLoadingRef.current) {
          publishFooterValidationResults();
        }
      } catch {
        // Best-effort marker collection for partial YAML in the diff preview.
      }
    },
    [
      applyMergedHighlightsIfNeeded,
      collectYamlSchemaResultsFromModel,
      getActiveEditor,
      publishFooterValidationResults,
    ]
  );

  const publishYamlSchemaResultsFromModelRef = useRef(publishYamlSchemaResultsFromModel);
  publishYamlSchemaResultsFromModelRef.current = publishYamlSchemaResultsFromModel;

  const waitForYamlSchemaMarkersOnModel = async (
    model: monaco.editor.ITextModel,
    schemas: SchemasSettings[],
    signal: AbortSignal,
    options: { listenerOnly?: boolean } = {}
  ): Promise<boolean> => {
    if (schemas.length === 0 || modelHasYamlOwnerMarkers(model)) {
      return false;
    }

    const schemasFingerprint = getPreviewSchemasFingerprint(schemas);
    const needsSchemaRegistration =
      schemasFingerprint !== registeredPreviewSchemasFingerprintRef.current;

    if (options.listenerOnly && !needsSchemaRegistration) {
      return false;
    }

    await waitForPreviewYamlSchemaMarkers(model, schemas, signal, {
      registerSchemas: needsSchemaRegistration,
      maxWaitMs: needsSchemaRegistration
        ? undefined
        : WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_REUSE_MAX_WAIT_MS,
    });

    const registeredFingerprint = registeredPreviewSchemasFingerprintRef.current;
    if (registeredFingerprint !== schemasFingerprint) {
      registeredPreviewSchemasFingerprintRef.current = schemasFingerprint;
    }

    return true;
  };

  const runValidationRef = useRef<() => Promise<void>>(async () => undefined);
  const validationSequenceRef = useRef(0);

  runValidationRef.current = async () => {
    if (!isEditorMounted || !highlightValidationErrors) {
      return;
    }

    const sequence = ++validationSequenceRef.current;
    validationAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    validationAbortControllerRef.current = abortController;
    beginValidationRun();

    const editor = getActiveEditor();
    const model = editor?.getModel();
    if (!editor || !model) {
      return;
    }

    const yamlToValidate = validationYamlRef.current;
    let didWaitForYamlSchema = false;

    try {
      didWaitForYamlSchema = await waitForYamlSchemaMarkersOnModel(
        model,
        monacoYamlSchemasRef.current,
        abortController.signal,
        {
          listenerOnly: registeredPreviewSchemasFingerprintRef.current.length > 0,
        }
      );

      if (abortController.signal.aborted || sequence !== validationSequenceRef.current) {
        return;
      }

      const { validationResults: nextValidationResults, yamlDocument } =
        await applyWorkflowYamlValidationToEditor(
          editor,
          yamlToValidate,
          true,
          validationDecorationsRef,
          abortController.signal,
          {
            skipApplyingHighlights: true,
            validationContext: validationContextRef.current,
          }
        );

      if (abortController.signal.aborted || sequence !== validationSequenceRef.current) {
        return;
      }

      computedYamlDocumentRef.current = yamlDocument;
      customValidationResultsRef.current = nextValidationResults;

      const nextYamlSchemaResults = collectYamlSchemaResultsFromModel(model);
      lastPublishedYamlFingerprintRef.current = validationResultsFingerprint(nextYamlSchemaResults);
      lastYamlMarkersFingerprintRef.current = getYamlOwnerMarkersFingerprint(model);
      yamlSchemaResultsRef.current = nextYamlSchemaResults;

      applyMergedHighlightsIfNeeded(editor);
      markInitialValidationPassComplete(didWaitForYamlSchema);
      completeValidationRun();
    } catch (validationError) {
      if (
        abortController.signal.aborted ||
        sequence !== validationSequenceRef.current ||
        (validationError instanceof DOMException && validationError.name === 'AbortError')
      ) {
        return;
      }

      customValidationResultsRef.current = [];

      const nextYamlSchemaResults = collectYamlSchemaResultsFromModel(model);
      yamlSchemaResultsRef.current = nextYamlSchemaResults;
      applyMergedHighlightsIfNeeded(editor);
      markInitialValidationPassComplete(didWaitForYamlSchema);
      completeValidationRun();
    }
  };

  useEffect(
    () => () => {
      validationAbortControllerRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (!highlightValidationErrors || !isEditorMounted) {
      return;
    }

    const editor = getActiveEditor();
    const model = editor?.getModel();
    if (!model) {
      return;
    }

    const modelUri = model.uri?.toString();
    if (!modelUri) {
      return;
    }

    lastYamlMarkersFingerprintRef.current = getYamlOwnerMarkersFingerprint(model);

    const disposable = monaco.editor.onDidChangeMarkers((changedUris) => {
      if (isApplyingHighlightsRef.current) {
        return;
      }

      if (!changedUris.some((uri) => uri.toString() === modelUri)) {
        return;
      }

      const yamlMarkersFingerprint = getYamlOwnerMarkersFingerprint(model);
      if (yamlMarkersFingerprint === lastYamlMarkersFingerprintRef.current) {
        return;
      }

      lastYamlMarkersFingerprintRef.current = yamlMarkersFingerprint;
      publishYamlSchemaResultsFromModelRef.current(model);
    });

    return () => disposable.dispose();
  }, [getActiveEditor, highlightValidationErrors, isEditorMounted, validationYaml]);

  useEffect(() => {
    if (!highlightValidationErrors) {
      wasHighlightEnabledRef.current = false;
      resetInitialValidationPass();
      completedInitialPassWithoutYamlSchemaRef.current = false;
      resetValidationResultsState();
      validationAbortControllerRef.current?.abort();
      isValidationLoadingRef.current = false;
      setIsValidationLoading(false);
      setPublishedValidationResults([]);
      syncValidationDisplay(false);
      clearEditorValidation();
      return;
    }

    const validationYamlChanged = previousValidationYamlRef.current !== validationYaml;
    const justEnabled = !wasHighlightEnabledRef.current;
    wasHighlightEnabledRef.current = true;

    if (validationYamlChanged) {
      previousValidationYamlRef.current = validationYaml;
      validationAbortControllerRef.current?.abort();
      resetValidationResultsState();
      resetInitialValidationPass();
    }

    if (!isEditorMounted) {
      if (validationYamlChanged) {
        beginValidationRun();
      }
      return;
    }

    syncValidationDisplay(true);

    if (justEnabled || !hasInitialValidationPassRef.current) {
      void runValidationRef.current();
    }
  }, [
    beginValidationRun,
    clearEditorValidation,
    getActiveEditor,
    highlightValidationErrors,
    isEditorMounted,
    resetInitialValidationPass,
    resetValidationResultsState,
    syncValidationDisplay,
    validationYaml,
  ]);

  useEffect(() => {
    if (
      !highlightValidationErrors ||
      !isEditorMounted ||
      monacoYamlSchemas.length === 0 ||
      !wasHighlightEnabledRef.current ||
      !hasInitialValidationPassRef.current ||
      !completedInitialPassWithoutYamlSchemaRef.current
    ) {
      return;
    }

    completedInitialPassWithoutYamlSchemaRef.current = false;
    void runValidationRef.current();
  }, [highlightValidationErrors, isEditorMounted, monacoYamlSchemas]);

  const handleValidationErrorClick = useCallback(
    (error: YamlValidationResult) => {
      const editor = getActiveEditor();
      if (!editor || error.startLineNumber <= 0) {
        return;
      }

      navigateToErrorPosition(editor, error.startLineNumber, error.startColumn);
    },
    [getActiveEditor]
  );

  return {
    validationResults: publishedValidationResults,
    isValidationLoading:
      highlightValidationErrors && (isValidationLoading || !hasInitialValidationPass),
    handleValidationErrorClick,
  };
};
