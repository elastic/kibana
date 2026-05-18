/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/code-editor';

interface RegisterKeyboardCommandsParams {
  /** The current Monaco editor instance. */
  editor: monaco.editor.IStandaloneCodeEditor;
  /** Function for sending the selected request(s). */
  sendRequest: () => void;
  /** Function for indenting the selected request(s). */
  autoIndent: () => void;
  /** Function that returns the documentation link for the selected request. */
  getDocumentationLink: () => Promise<string | null> | undefined;
  /** Function for moving the cursor to the previous request edge. */
  moveToPreviousRequestEdge: () => void;
  /** Function for moving the cursor to the next request edge. */
  moveToNextRequestEdge: () => void;
}

const SEND_REQUEST_ACTION_ID = 'sendRequest';
const AUTO_INDENT_ACTION_ID = 'autoIndent';
const OPEN_DOCS_ACTION_ID = 'openDocs';
const MOVE_UP_ACTION_ID = 'moveUp';
const MOVE_DOWN_ACTION_ID = 'moveDown';
const MOVE_TO_LINE_ACTION_ID = 'moveToLine';

const CONSOLE_EDITOR_FEATURE_ID = 'console:editor';

const REQUEST_SHORTCUTS_GROUP = i18n.translate(
  'console.keyboardCommandActionLabel.requestShortcutsGroup',
  {
    defaultMessage: 'Request shortcuts',
  }
);

const buildHotkeysDiscoveryMeta = (
  id: string,
  options: { label: string; description?: string; group?: string }
) => ({
  id,
  label: options.label,
  description: options.description,
  featureId: CONSOLE_EDITOR_FEATURE_ID,
  group: options.group,
  scope: 'context' as const,
  allowUserRebinding: true as const,
});

/**
 * Hook that returns a function for registering keyboard commands in the editor.
 *
 * @param params The {@link RegisterKeyboardCommandsParams} to use.
 */
export const useKeyboardCommandsUtils = () => {
  const sendRequestAction = useRef<monaco.IDisposable | null>(null);
  const autoIndentAction = useRef<monaco.IDisposable | null>(null);
  const openDocsAction = useRef<monaco.IDisposable | null>(null);
  const moveToPreviousAction = useRef<monaco.IDisposable | null>(null);
  const moveToNextAction = useRef<monaco.IDisposable | null>(null);
  const moveToLineAction = useRef<monaco.IDisposable | null>(null);

  const disposeAllActions = () => {
    if (sendRequestAction.current) {
      sendRequestAction.current.dispose();
    }
    if (autoIndentAction.current) {
      autoIndentAction.current.dispose();
    }
    if (openDocsAction.current) {
      openDocsAction.current.dispose();
    }
    if (moveToPreviousAction.current) {
      moveToPreviousAction.current.dispose();
    }
    if (moveToNextAction.current) {
      moveToNextAction.current.dispose();
    }
    if (moveToLineAction.current) {
      moveToLineAction.current.dispose();
    }
  };

  const registerKeyboardCommands = (params: RegisterKeyboardCommandsParams) => {
    const {
      editor,
      sendRequest,
      autoIndent,
      getDocumentationLink,
      moveToPreviousRequestEdge,
      moveToNextRequestEdge,
    } = params;

    const openDocs = async () => {
      const documentation = await getDocumentationLink();
      if (!documentation) {
        return;
      }
      window.open(documentation, '_blank');
    };

    disposeAllActions();

    sendRequestAction.current = editor.addAction({
      id: SEND_REQUEST_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.sendRequest', {
        defaultMessage: 'Send request',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: sendRequest,
      hotkeysDiscovery: buildHotkeysDiscoveryMeta('console:sendRequest', {
        label: i18n.translate('console.keyboardCommandActionLabel.sendRequest', {
          defaultMessage: 'Send request',
        }),
        description: i18n.translate('console.keyboardCommandActionLabel.sendRequestDescription', {
          defaultMessage: 'Execute the currently highlighted request',
        }),
      }),
    });

    autoIndentAction.current = editor.addAction({
      id: AUTO_INDENT_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.autoIndent', {
        defaultMessage: 'Apply indentations',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
      run: autoIndent,
      hotkeysDiscovery: buildHotkeysDiscoveryMeta('console:autoIndent', {
        label: i18n.translate('console.keyboardCommandActionLabel.autoIndent', {
          defaultMessage: 'Apply indentations',
        }),
        description: i18n.translate('console.keyboardCommandActionLabel.autoIndentDescription', {
          defaultMessage: 'Apply indentations to the current request',
        }),
        group: REQUEST_SHORTCUTS_GROUP,
      }),
    });

    openDocsAction.current = editor.addAction({
      id: OPEN_DOCS_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.openDocs', {
        defaultMessage: 'Open documentation',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
      run: openDocs,
      hotkeysDiscovery: buildHotkeysDiscoveryMeta('console:openDocs', {
        label: i18n.translate('console.keyboardCommandActionLabel.openDocs', {
          defaultMessage: 'Open documentation',
        }),
        description: i18n.translate('console.keyboardCommandActionLabel.openDocsDescription', {
          defaultMessage: 'Open documentation for the current request',
        }),
        group: REQUEST_SHORTCUTS_GROUP,
      }),
    });

    moveToPreviousAction.current = editor.addAction({
      id: MOVE_UP_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.moveToPreviousRequestEdge', {
        defaultMessage: 'Move to previous request start or end',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.UpArrow],
      run: moveToPreviousRequestEdge,
      hotkeysDiscovery: buildHotkeysDiscoveryMeta('console:moveToPreviousRequestEdge', {
        label: i18n.translate('console.keyboardCommandActionLabel.moveToPreviousRequestEdge', {
          defaultMessage: 'Move to previous request start or end',
        }),
        description: i18n.translate(
          'console.keyboardCommandActionLabel.moveToPreviousRequestEdgeDescription',
          {
            defaultMessage: 'Move to previous request start or end',
          }
        ),
        group: REQUEST_SHORTCUTS_GROUP,
      }),
    });

    moveToNextAction.current = editor.addAction({
      id: MOVE_DOWN_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.moveToNextRequestEdge', {
        defaultMessage: 'Move to next request start or end',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.DownArrow],
      run: moveToNextRequestEdge,
      hotkeysDiscovery: buildHotkeysDiscoveryMeta('console:moveToNextRequestEdge', {
        label: i18n.translate('console.keyboardCommandActionLabel.moveToNextRequestEdge', {
          defaultMessage: 'Move to next request start or end',
        }),
        description: i18n.translate(
          'console.keyboardCommandActionLabel.moveToNextRequestEdgeDescription',
          {
            defaultMessage: 'Move to next request start or end',
          }
        ),
        group: REQUEST_SHORTCUTS_GROUP,
      }),
    });

    moveToLineAction.current = editor.addAction({
      id: MOVE_TO_LINE_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.moveToLine', {
        defaultMessage: 'Move cursor to a line',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: () => {
        const line = parseInt(prompt('Enter line number') ?? '', 10);
        if (!isNaN(line)) {
          editor.setPosition({ lineNumber: line, column: 1 });
        }
      },
      hotkeysDiscovery: buildHotkeysDiscoveryMeta('console:moveToLine', {
        label: i18n.translate('console.keyboardCommandActionLabel.moveToLine', {
          defaultMessage: 'Go to line',
        }),
        description: i18n.translate('console.keyboardCommandActionLabel.moveToLineDescription', {
          defaultMessage: 'Move cursor to a specific line number',
        }),
        group: REQUEST_SHORTCUTS_GROUP,
      }),
    });
  };

  const unregisterKeyboardCommands = () => disposeAllActions();

  return { registerKeyboardCommands, unregisterKeyboardCommands };
};
