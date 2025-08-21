/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import { useCallback, useRef, useState } from 'react';
import { parseDocument } from 'yaml';
import _ from 'lodash';
import type { HttpSetup } from '@kbn/core/public';
import { getCurrentPath, parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { YamlValidationError, YamlValidationErrorSeverity } from '../model/types';
import { MUSTACHE_REGEX_GLOBAL } from './regex';
import { MarkerSeverity, getSeverityString } from './utils';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getContextForPath } from '../../../features/workflow_context/lib/get_context_for_path';
import { findEndpointByMethodAndPath, getOrBuildEndpointIndex } from './console_specs/indexer';

interface UseYamlValidationProps {
  workflowYamlSchema: z.ZodSchema;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
  http?: HttpSetup;
}

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Hint,
};

export function getApiManualOnlyMarkers(
  workflow: any,
  text: string,
  model: Pick<monaco.editor.ITextModel, 'getPositionAt'>
): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];
  const hasNonManualTrigger = (workflow.triggers ?? []).some(
    (t: any) => t?.type !== 'triggers.elastic.manual' && t?.enabled !== false
  );
  if (!hasNonManualTrigger) return markers;

  const steps: any[] = workflow.steps ?? [];
  steps.forEach((step: any, index: number) => {
    if (step?.type === 'elasticsearch.request' || step?.type === 'kibana.request') {
      const stepName = step?.name ?? `step ${index + 1}`;
      const search = `name: ${stepName}`;
      const nameIdx = text.indexOf(search);
      const startPos = nameIdx >= 0 ? model.getPositionAt(nameIdx) : { lineNumber: 1, column: 1 };
      const endPos =
        nameIdx >= 0 ? model.getPositionAt(nameIdx + search.length) : { lineNumber: 1, column: 1 };
      const message =
        'API steps are manual-only in this PoC. Remove non-manual triggers or remove API steps.';
      markers.push({
        severity: SEVERITY_MAP.warning,
        message,
        startLineNumber: (startPos as any).lineNumber,
        startColumn: (startPos as any).column,
        endLineNumber: (endPos as any).lineNumber,
        endColumn: (endPos as any).column,
        source: 'api-steps-manual-only',
      });
    }
  });
  return markers;
}

// Phase 1: Method/path presence validation for elasticsearch.request steps
export function getEsMethodPathPresenceMarkers(
  workflow: any,
  text: string,
  model: Pick<monaco.editor.ITextModel, 'getPositionAt'>
): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];
  const steps: any[] = workflow.steps ?? [];

  const hasMustache = (val: unknown) => {
    if (typeof val !== 'string') return false;
    // Reset lastIndex for global regex safety
    MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
    return MUSTACHE_REGEX_GLOBAL.test(val);
  };

  const findAnchorForStep = (step: any, index: number) => {
    const tryFind = (needle: string) => {
      const idx = text.indexOf(needle);
      return idx >= 0 ? model.getPositionAt(idx) : { lineNumber: 1, column: 1 };
    };
    if (step?.name) {
      const search = `name: ${step.name}`;
      return tryFind(search);
    }
    return tryFind('elasticsearch.request');
  };

  steps.forEach((step: any, index: number) => {
    if (step?.type !== 'elasticsearch.request') return;
    const method = step?.with?.method;
    const path = step?.with?.path;

    const anchor = findAnchorForStep(step, index);

    if (!method || (typeof method === 'string' && method.trim() === '') || hasMustache(method)) {
      // If method has mustache, skip presence validation
      if (!hasMustache(method)) {
        markers.push({
          severity: SEVERITY_MAP.warning,
          message: "Elasticsearch API step is missing 'with.method'.",
          startLineNumber: (anchor as any).lineNumber,
          startColumn: (anchor as any).column,
          endLineNumber: (anchor as any).lineNumber,
          endColumn: (anchor as any).column + 1,
          source: 'es-api-presence',
        });
      }
    }

    if (!path || (typeof path === 'string' && path.trim() === '') || hasMustache(path)) {
      // If path has mustache, skip presence validation
      if (!hasMustache(path)) {
        markers.push({
          severity: SEVERITY_MAP.warning,
          message: "Elasticsearch API step is missing 'with.path'.",
          startLineNumber: (anchor as any).lineNumber,
          startColumn: (anchor as any).column,
          endLineNumber: (anchor as any).lineNumber,
          endColumn: (anchor as any).column + 1,
          source: 'es-api-presence',
        });
      }
    }
  });

  return markers;
}

async function getEsUnknownEndpointMarkers(
  workflow: any,
  text: string,
  model: Pick<monaco.editor.ITextModel, 'getPositionAt'>,
  http?: HttpSetup
): Promise<monaco.editor.IMarkerData[]> {
  const markers: monaco.editor.IMarkerData[] = [];
  if (!http) return markers; // console optional; graceful fallback

  const index = await getOrBuildEndpointIndex(http);
  if (!index || index.size === 0) return markers;

  const hasMustache = (val: unknown) => {
    if (typeof val !== 'string') return false;
    MUSTACHE_REGEX_GLOBAL.lastIndex = 0;
    return MUSTACHE_REGEX_GLOBAL.test(val);
  };

  const steps: any[] = workflow.steps ?? [];
  steps.forEach((step: any, i: number) => {
    if (step?.type !== 'elasticsearch.request') return;
    const method: string | undefined = step?.with?.method;
    const path: string | undefined = step?.with?.path;

    if (!method || !path) return;
    if (hasMustache(method) || hasMustache(path)) return;

    const result = findEndpointByMethodAndPath(index, method, path);
    if (!result.matched) {
      const search = step?.name ? `name: ${step.name}` : 'elasticsearch.request';
      const idx = text.indexOf(search);
      const startPos = idx >= 0 ? model.getPositionAt(idx) : { lineNumber: 1, column: 1 };
      const endPos =
        idx >= 0 ? model.getPositionAt(idx + search.length) : { lineNumber: 1, column: 1 };
      markers.push({
        severity: SEVERITY_MAP.warning,
        message: 'Unknown Elasticsearch endpoint for the selected method + path.',
        startLineNumber: (startPos as any).lineNumber,
        startColumn: (startPos as any).column,
        endLineNumber: (endPos as any).lineNumber,
        endColumn: (endPos as any).column,
        source: 'es-api-unknown-endpoint',
      });
    }
  });

  return markers;
}

export interface UseYamlValidationResult {
  validationErrors: YamlValidationError[] | null;
  validateVariables: (
    editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor
  ) => Promise<void>;
  handleMarkersChanged: (
    editor: monaco.editor.IStandaloneCodeEditor,
    modelUri: monaco.Uri,
    markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
    owner: string
  ) => void;
}

export function useYamlValidation({
  workflowYamlSchema,
  onValidationErrors,
  http,
}: UseYamlValidationProps): UseYamlValidationResult {
  const [validationErrors, setValidationErrors] = useState<YamlValidationError[] | null>(null);
  const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // Function to validate mustache expressions and apply decorations
  const validateVariables = useCallback(
    async (editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor) => {
      const model = editor.getModel();
      if (!model) {
        return;
      }

      if ('original' in model) {
        // TODO: validate diff editor
        return;
      }

      editor = editor as monaco.editor.IStandaloneCodeEditor;

      // Always ensure we clear and set markers, even on failures, to avoid stuck UI state
      const applyMarkers = (markers: monaco.editor.IMarkerData[]) => {
        try {
          monaco.editor.setModelMarkers(model, 'mustache-validation', markers);
        } catch (e) {
          // noop
        }
      };

      try {
        const text = model.getValue();

        // Parse the YAML to JSON to get the workflow definition (loose schema)
        const result = parseWorkflowYamlToJSON(text, workflowYamlSchema);
        const yamlDocument = parseDocument(text);

        // Collect markers to add to the model (do this synchronously first)
        const markers: monaco.editor.IMarkerData[] = [];

        // Clear previous decorations eagerly
        if (decorationsCollection.current) {
          decorationsCollection.current.clear();
          decorationsCollection.current = null;
        }

        if (result.success) {
          const workflowGraph = getWorkflowGraph(result.data);

          // 1) Manual-only API steps warning
          markers.push(...getApiManualOnlyMarkers(result.data, text, model));

          // 2) ES method/path presence validation (non-blocking)
          markers.push(...getEsMethodPathPresenceMarkers(result.data, text, model));

          // Compute mustache decorations and variable existence checks
          const matches = [...text.matchAll(MUSTACHE_REGEX_GLOBAL)];
          const decorations: monaco.editor.IModelDeltaDecoration[] = [];

          for (const match of matches) {
            const matchStart = match.index ?? 0;
            const matchEnd = matchStart + match[0].length; // match[0] is the entire {{...}} expression

            // Get the position (line, column) for the match
            const startPos = model.getPositionAt(matchStart);
            const endPos = model.getPositionAt(matchEnd);

            let errorMessage: string | null = null;
            const severity: YamlValidationErrorSeverity = 'warning';

            const path = getCurrentPath(yamlDocument, matchStart);
            const context = getContextForPath(result.data, workflowGraph, path);

            if (match.groups?.key) {
              if (!_.get(context, match.groups.key)) {
                errorMessage = `Variable ${match.groups?.key} is not defined`;
              }
            } else {
              errorMessage = `Variable is not defined`;
            }

            // Add marker for validation issues
            if (errorMessage) {
              markers.push({
                severity: SEVERITY_MAP[severity],
                message: errorMessage,
                startLineNumber: startPos.lineNumber,
                startColumn: startPos.column,
                endLineNumber: endPos.lineNumber,
                endColumn: endPos.column,
                source: 'mustache-validation',
              });

              decorations.push({
                range: new monaco.Range(
                  startPos.lineNumber,
                  startPos.column,
                  endPos.lineNumber,
                  endPos.column
                ),
                options: {
                  inlineClassName: 'template-variable-error',
                  stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                },
              });
            } else {
              decorations.push({
                range: new monaco.Range(
                  startPos.lineNumber,
                  startPos.column,
                  endPos.lineNumber,
                  endPos.column
                ),
                options: {
                  inlineClassName: 'template-variable-valid',
                  stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                },
              });
            }
          }

          // Apply decorations
          if (decorations.length > 0) {
            decorationsCollection.current = editor.createDecorationsCollection(decorations);
          }

          // Apply initial markers immediately so UI updates without waiting for async work
          applyMarkers(markers);

          // 3) ES unknown endpoint validation (non-blocking, spec-driven) — run after initial markers
          (async () => {
            try {
              const unknownEndpointMarkers = await getEsUnknownEndpointMarkers(
                result.data,
                text,
                model,
                http
              );
              if (unknownEndpointMarkers.length > 0) {
                applyMarkers([...markers, ...unknownEndpointMarkers]);
              }
            } catch {
              // ignore
            }
          })();
        } else {
          // Schema parse failed: still clear decorations and set empty markers
          applyMarkers([]);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        // Ensure we surface an empty marker set so the footer leaves the initializing state
        applyMarkers([]);
      }
    },
    [workflowYamlSchema, http]
  );

  const handleMarkersChanged = useCallback(
    (
      editor: monaco.editor.IStandaloneCodeEditor,
      modelUri: monaco.Uri,
      markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
      owner: string
    ) => {
      const editorUri = editor.getModel()?.uri;
      if (!editorUri || modelUri.toString() !== editorUri.toString()) {
        return;
      }

      const errors: YamlValidationError[] = [];
      for (const marker of markers) {
        errors.push({
          message: marker.message,
          severity: getSeverityString((marker.severity as MarkerSeverity) ?? MarkerSeverity.Info),
          lineNumber: marker.startLineNumber,
          column: marker.startColumn,
          owner,
        });
      }
      const errorsUpdater = (prevErrors: YamlValidationError[] | null) => {
        const prevOtherOwners = prevErrors?.filter((e) => e.owner !== owner);
        return [...(prevOtherOwners ?? []), ...errors];
      };
      setValidationErrors(errorsUpdater);
      onValidationErrors?.(errorsUpdater);
    },
    [onValidationErrors]
  );

  return {
    validationErrors,
    validateVariables,
    handleMarkersChanged,
  };
}
