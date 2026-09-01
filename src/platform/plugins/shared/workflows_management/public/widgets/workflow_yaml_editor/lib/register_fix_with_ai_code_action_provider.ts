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

/** Position and message of the diagnostic the agent is asked to fix. */
export interface FixWithAiTarget {
  startLineNumber: number;
  startColumn: number;
  message: string;
}

interface RegisterFixWithAiCodeActionProviderParams {
  /** Read on every invocation, so the provider can be registered once. */
  getFixWithAi: () => (target: FixWithAiTarget) => void;
}

const isFixableSeverity = (severity: monaco.MarkerSeverity) =>
  severity === monaco.MarkerSeverity.Error || severity === monaco.MarkerSeverity.Warning;

/**
 * Several validators usually flag the same spot with different ranges and messages. Monaco only
 * passes the markers under the cursor, so they all describe one problem: build a single action
 * carrying every message instead of a row per marker.
 */
const buildTarget = (markers: monaco.editor.IMarkerData[]): FixWithAiTarget | null => {
  const fixable = markers.filter(
    (marker) => isFixableSeverity(marker.severity) && Boolean(marker.message)
  );
  if (fixable.length === 0) {
    return null;
  }
  const [first] = [...fixable].sort(
    (a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn
  );
  return {
    startLineNumber: first.startLineNumber,
    startColumn: first.startColumn,
    message: [...new Set(fixable.map((marker) => marker.message))].join('\n'),
  };
};

/**
 * Offers a "Fix with AI Agent" quick fix on every validation marker, so the agent can be
 * reached from the diagnostic itself instead of only from the validation list.
 */
export const registerFixWithAiCodeActionProvider = ({
  getFixWithAi,
}: RegisterFixWithAiCodeActionProviderParams): monaco.IDisposable => {
  const commandDisposable = monaco.editor.registerCommand(
    FIX_WITH_AI_COMMAND_ID,
    (_accessor, target: FixWithAiTarget) => {
      getFixWithAi()(target);
    }
  );

  const providerDisposable = monaco.languages.registerCodeActionProvider(YAML_LANG_ID, {
    provideCodeActions: (_model, _range, context) => {
      const target = buildTarget(context.markers);
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
