/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { monaco, YAML_LANG_ID } from '@kbn/monaco';

/**
 * Command ID for the "Fix in Chat" action
 */
export const FIX_IN_CHAT_COMMAND_ID = 'workflows.fixInChat';

// Global callback registry for the Fix in Chat command
// This allows us to register the callback once and update it as needed
let fixInChatCallback: FixInChatCallback | null = null;
let commandRegistered = false;

/**
 * Callback type for when the user triggers "Fix in Chat"
 */
export type FixInChatCallback = (errorContext: {
  message: string;
  lineNumber: number;
  columnNumber: number;
}) => void;

/**
 * Creates a Code Action Provider that adds "Fix in Chat" as a quick fix option
 * for validation errors in the workflow YAML editor.
 */
export function createFixInChatCodeActionProvider(): monaco.languages.CodeActionProvider {
  return {
    provideCodeActions(
      _model: monaco.editor.ITextModel,
      _range: monaco.Range,
      context: monaco.languages.CodeActionContext,
      _token: monaco.CancellationToken
    ): monaco.languages.ProviderResult<monaco.languages.CodeActionList> {
      const actions: monaco.languages.CodeAction[] = [];

      // Get markers (errors/warnings) that intersect with the current range
      const markers = context.markers;

      if (markers.length === 0) {
        return { actions: [], dispose: () => {} };
      }

      // Create a "Fix in Chat" action for each marker
      for (const marker of markers) {
        // Only provide fix for errors and warnings
        if (
          marker.severity === monaco.MarkerSeverity.Error ||
          marker.severity === monaco.MarkerSeverity.Warning
        ) {
          const action: monaco.languages.CodeAction = {
            title: i18n.translate('workflows.codeAction.fixInChat', {
              defaultMessage: 'Fix in Chat',
            }),
            kind: 'quickfix',
            diagnostics: [marker],
            isPreferred: false, // Not the preferred action (user should choose)
            command: {
              id: FIX_IN_CHAT_COMMAND_ID,
              title: i18n.translate('workflows.codeAction.fixInChat', {
                defaultMessage: 'Fix in Chat',
              }),
              arguments: [
                {
                  message: marker.message,
                  lineNumber: marker.startLineNumber,
                  columnNumber: marker.startColumn,
                },
              ],
            },
          };

          actions.push(action);
        }
      }

      return {
        actions,
        dispose: () => {},
      };
    },
  };
}

// Store the command disposable for cleanup
let commandDisposable: monaco.IDisposable | null = null;

/**
 * Registers the global command handler for Fix in Chat.
 * This should be called once when Monaco is initialized.
 */
function ensureCommandRegistered(): void {
  if (commandRegistered) return;

  // Register a global command handler using Monaco's editor API
  commandDisposable = monaco.editor.registerCommand(
    FIX_IN_CHAT_COMMAND_ID,
    (_accessor: unknown, args: unknown) => {
      if (
        fixInChatCallback &&
        args &&
        typeof args === 'object' &&
        'message' in args &&
        'lineNumber' in args &&
        'columnNumber' in args
      ) {
        fixInChatCallback(args as { message: string; lineNumber: number; columnNumber: number });
      }
    }
  );

  commandRegistered = true;
}

/**
 * Registers the Fix in Chat code action provider and sets the callback handler.
 * Returns a disposable that cleans up the registration.
 */
export function registerFixInChatCodeActionProvider(
  _editor: monaco.editor.IStandaloneCodeEditor,
  onFixInChat: FixInChatCallback
): monaco.IDisposable {
  // Store the callback globally
  fixInChatCallback = onFixInChat;

  // Ensure the command is registered
  ensureCommandRegistered();

  // Register the code action provider
  const provider = createFixInChatCodeActionProvider();
  const providerDisposable = monaco.languages.registerCodeActionProvider(YAML_LANG_ID, provider);

  return {
    dispose: () => {
      providerDisposable.dispose();
      // Clear the callback when disposed
      fixInChatCallback = null;
    },
  };
}
