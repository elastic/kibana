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
import { monaco } from '@kbn/monaco';

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
    });

    autoIndentAction.current = editor.addAction({
      id: AUTO_INDENT_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.autoIndent', {
        defaultMessage: 'Apply indentations',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
      run: autoIndent,
    });

    openDocsAction.current = editor.addAction({
      id: OPEN_DOCS_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.openDocs', {
        defaultMessage: 'Open documentation',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
      run: openDocs,
    });

    moveToPreviousAction.current = editor.addAction({
      id: MOVE_UP_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.moveToPreviousRequestEdge', {
        defaultMessage: 'Move to previous request start or end',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.UpArrow],
      run: moveToPreviousRequestEdge,
    });

    moveToNextAction.current = editor.addAction({
      id: MOVE_DOWN_ACTION_ID,
      label: i18n.translate('console.keyboardCommandActionLabel.moveToNextRequestEdge', {
        defaultMessage: 'Move to next request start or end',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.DownArrow],
      run: moveToNextRequestEdge,
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
    });
  };

  const unregisterKeyboardCommands = () => disposeAllActions();

  return { registerKeyboardCommands, unregisterKeyboardCommands };
};
