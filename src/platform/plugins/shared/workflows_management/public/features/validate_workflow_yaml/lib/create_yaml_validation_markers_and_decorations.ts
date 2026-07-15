/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import { MarkerSeverity } from '../../../widgets/workflow_yaml_editor/lib/utils';
import type { YamlValidationResult } from '../model/types';

const SEVERITY_MAP = {
  error: MarkerSeverity.Error,
  warning: MarkerSeverity.Warning,
  info: MarkerSeverity.Info,
};

export interface CreateMarkersAndDecorationsOptions {
  omitMarginDecorations?: boolean;
  omitMarkersForOwners?: readonly string[];
}

// eslint-disable-next-line complexity
export function createMarkersAndDecorations(
  validationResults: YamlValidationResult[],
  options?: CreateMarkersAndDecorationsOptions
): {
  markers: monaco.editor.IMarkerData[];
  decorations: monaco.editor.IModelDeltaDecoration[];
} {
  const omitMarginDecorations = options?.omitMarginDecorations ?? false;
  const omitMarkersForOwners = options?.omitMarkersForOwners ?? [];
  const shouldCreateMarker = (owner: string): boolean => !omitMarkersForOwners.includes(owner);
  const markers: monaco.editor.IMarkerData[] = [];
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  for (const validationResult of validationResults) {
    const pushMarker = (marker: monaco.editor.IMarkerData): void => {
      if (shouldCreateMarker(validationResult.owner)) {
        markers.push(marker);
      }
    };
    const marker = {
      startLineNumber: validationResult.startLineNumber,
      startColumn: validationResult.startColumn,
      endLineNumber: validationResult.endLineNumber,
      endColumn: validationResult.endColumn,
    };
    if (validationResult.owner === 'variable-validation') {
      if (validationResult.severity !== null) {
        pushMarker({
          ...marker,
          severity: SEVERITY_MAP[validationResult.severity],
          message: validationResult.message,
          source: 'variable-validation',
        });
      }
      decorations.push({
        range: createRange(validationResult),
        options: {
          inlineClassName: `template-variable-${validationResult.severity ?? 'valid'}`,
          hoverMessage: validationResult.hoverMessage
            ? createMarkdownContent(validationResult.hoverMessage)
            : null,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    } else if (validationResult.owner === 'json-schema-default-validation') {
      if (validationResult.severity !== null) {
        pushMarker({
          ...marker,
          severity: SEVERITY_MAP[validationResult.severity],
          message: validationResult.message,
          source: 'json-schema-default-validation',
        });
      }
    } else if (validationResult.owner === 'liquid-template-validation') {
      pushMarker({
        ...marker,
        severity: SEVERITY_MAP[validationResult.severity],
        message: validationResult.message,
        source: 'liquid-template-validation',
      });
      decorations.push({
        range: createRange(validationResult),
        options: {
          inlineClassName: `liquid-template-${validationResult.severity ?? 'valid'}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: validationResult.hoverMessage
            ? createMarkdownContent(validationResult.hoverMessage)
            : null,
        },
      });
    } else if (validationResult.owner === 'step-name-validation') {
      pushMarker({
        ...marker,
        severity: SEVERITY_MAP[validationResult.severity],
        message: validationResult.message,
        source: 'step-name-validation',
      });
      decorations.push({
        range: new monaco.Range(
          validationResult.startLineNumber,
          1,
          validationResult.startLineNumber,
          validationResult.endColumn
        ),
        options: {
          className: 'duplicate-step-name-error',
          ...(omitMarginDecorations
            ? { isWholeLine: true }
            : {
                marginClassName: 'duplicate-step-name-error-margin',
                isWholeLine: true,
              }),
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    } else if (validationResult.owner === 'connector-id-validation') {
      if (validationResult.severity !== null) {
        pushMarker({
          ...marker,
          severity: SEVERITY_MAP[validationResult.severity],
          message: validationResult.message ?? '',
          source: 'connector-id-validation',
        });
      }
      decorations.push({
        range: createRange(validationResult),
        options: createSelectionDecoration(validationResult),
      });
    } else if (validationResult.owner === 'step-property-validation') {
      if (validationResult.severity !== null) {
        pushMarker({
          ...marker,
          severity: SEVERITY_MAP[validationResult.severity],
          message: validationResult.message,
          source: 'step-property-validation',
        });
      }
      decorations.push({
        range: createRange(validationResult),
        options: createSelectionDecoration(validationResult),
      });
    } else if (validationResult.owner === 'workflow-output-validation') {
      pushMarker({
        ...marker,
        severity: SEVERITY_MAP[validationResult.severity],
        message: validationResult.message,
        source: 'workflow-output-validation',
      });
      decorations.push({
        range: createRange(validationResult),
        options: {
          inlineClassName: `workflow-output-validation-${validationResult.severity}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: validationResult.hoverMessage
            ? createMarkdownContent(validationResult.hoverMessage)
            : null,
        },
      });
    } else {
      if (validationResult.severity !== null) {
        pushMarker({
          ...marker,
          severity: SEVERITY_MAP[validationResult.severity],
          message: validationResult.message,
          source: validationResult.owner,
        });
      }
      decorations.push({
        range: createRange(validationResult),
        options: {
          inlineClassName: `${validationResult.owner}-${validationResult.severity ?? 'valid'}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: validationResult.hoverMessage
            ? createMarkdownContent(validationResult.hoverMessage)
            : null,
          after: validationResult.afterMessage
            ? {
                content: validationResult.afterMessage,
                cursorStops: monaco.editor.InjectedTextCursorStops.None,
                inlineClassName: `after-text`,
              }
            : null,
        },
      });
    }
  }
  return { markers, decorations };
}

function createRange(validationResult: YamlValidationResult): monaco.Range {
  return new monaco.Range(
    validationResult.startLineNumber,
    validationResult.startColumn,
    validationResult.endLineNumber,
    validationResult.endColumn
  );
}

function createMarkdownContent(content: string): monaco.IMarkdownString {
  return {
    value: content,
    isTrusted: true,
    supportHtml: true,
  };
}

function createSelectionDecoration(
  validationResult: YamlValidationResult
): monaco.editor.IModelDecorationOptions {
  const decorationOptions: monaco.editor.IModelDecorationOptions = {
    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    hoverMessage: validationResult.hoverMessage
      ? createMarkdownContent(validationResult.hoverMessage)
      : null,
    before: validationResult.beforeMessage
      ? {
          content: validationResult.beforeMessage,
          cursorStops: monaco.editor.InjectedTextCursorStops.None,
          inlineClassName: `connector-name-badge`,
        }
      : null,
  };
  if (validationResult.severity !== null) {
    decorationOptions.inlineClassName = `template-variable-${validationResult.severity}`;
  }
  return decorationOptions;
}
