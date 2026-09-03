/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, YAML_LANG_ID } from '@kbn/code-editor';
import { FIX_WITH_AI_LABEL } from './fix_with_ai_label';

export const FIX_WITH_AI_COMMAND_ID = 'workflows.editor.action.fixWithAi';

/** The diagnostic the agent is asked to fix. */
export interface FixWithAiTarget {
  startLineNumber: number;
  startColumn: number;
  message: string;
  severity: 'error' | 'warning';
}

interface RegisterFixWithAiCodeActionProviderParams {
  /** Read on every invocation, so the provider can be registered once. */
  getFixWithAi: () => (target: FixWithAiTarget) => void;
  /** Other yaml models can share the page (version preview), and only this one is editable. */
  isEditorModel: (model: monaco.editor.ITextModel) => boolean;
}

const isFixableSeverity = (severity: monaco.MarkerSeverity) =>
  severity === monaco.MarkerSeverity.Error || severity === monaco.MarkerSeverity.Warning;

/** Markers under the cursor describe one problem, so they become one action. */
const buildTarget = (markers: monaco.editor.IMarkerData[]): FixWithAiTarget | null => {
  const fixable = markers.filter(
    (marker) => isFixableSeverity(marker.severity) && Boolean(marker.message)
  );
  if (fixable.length === 0) {
    return null;
  }
  const first = fixable.reduce((earliest, marker) =>
    marker.startLineNumber < earliest.startLineNumber ||
    (marker.startLineNumber === earliest.startLineNumber &&
      marker.startColumn < earliest.startColumn)
      ? marker
      : earliest
  );
  return {
    startLineNumber: first.startLineNumber,
    startColumn: first.startColumn,
    message: [...new Set(fixable.map((marker) => marker.message))].join('\n'),
    severity: fixable.some((marker) => marker.severity === monaco.MarkerSeverity.Error)
      ? 'error'
      : 'warning',
  };
};

/** Offers the agent as a quick fix on the diagnostic, not only in the validation list. */
export const registerFixWithAiCodeActionProvider = ({
  getFixWithAi,
  isEditorModel,
}: RegisterFixWithAiCodeActionProviderParams): monaco.IDisposable => {
  const commandDisposable = monaco.editor.registerCommand(
    FIX_WITH_AI_COMMAND_ID,
    (_accessor, target: FixWithAiTarget) => {
      getFixWithAi()(target);
    }
  );

  const providerDisposable = monaco.languages.registerCodeActionProvider(YAML_LANG_ID, {
    provideCodeActions: (model, _range, context) => {
      const target = isEditorModel(model) ? buildTarget(context.markers) : null;
      if (!target) {
        return { actions: [], dispose: () => {} };
      }

      const action: monaco.languages.CodeAction = {
        title: FIX_WITH_AI_LABEL,
        kind: 'quickfix',
        diagnostics: context.markers,
        command: {
          id: FIX_WITH_AI_COMMAND_ID,
          title: FIX_WITH_AI_LABEL,
          arguments: [target],
        },
      };

      return { actions: [action], dispose: () => {} };
    },
  });

  return {
    dispose: () => {
      commandDisposable.dispose();
      providerDisposable.dispose();
    },
  };
};
