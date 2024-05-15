/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

/**
 * Hook that returns a function for registering keyboard commands in the editor.
 *
 * @param params The {@link RegisterKeyboardCommandsParams} to use.
 */
export const useRegisterKeyboardCommands = () => {
  return (params: RegisterKeyboardCommandsParams) => {
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

    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, sendRequest);

    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, autoIndent);

    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, openDocs);

    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.UpArrow, moveToPreviousRequestEdge);

    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.DownArrow, moveToNextRequestEdge);

    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      const line = parseInt(prompt('Enter line number') ?? '', 10);
      if (!isNaN(line)) {
        editor.setPosition({ lineNumber: line, column: 1 });
      }
    });
  };
};
