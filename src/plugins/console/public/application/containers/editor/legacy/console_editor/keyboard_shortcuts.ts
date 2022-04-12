/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { throttle } from 'lodash';
import { SenseEditor } from '../../../../models/sense_editor';

interface Actions {
  senseEditor: SenseEditor;
  sendCurrentRequestToES: () => void;
  openDocumentation: () => void;
}

const COMMANDS = {
  SEND_TO_ELASTICSEARCH: 'send to Elasticsearch',
  OPEN_DOCUMENTATION: 'open documentation',
  AUTO_INDENT_REQUEST: 'auto indent request',
  MOVE_TO_PREVIOUS_REQUEST: 'move to previous request start or end',
  MOVE_TO_NEXT_REQUEST: 'move to next request start or end',
  GO_TO_LINE: 'gotoline',
};

export function registerCommands({
  senseEditor,
  sendCurrentRequestToES,
  openDocumentation,
}: Actions) {
  const throttledAutoIndent = throttle(() => senseEditor.autoIndent(), 500, {
    leading: true,
    trailing: true,
  });
  const coreEditor = senseEditor.getCoreEditor();

  coreEditor.registerKeyboardShortcut({
    keys: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
    name: COMMANDS.SEND_TO_ELASTICSEARCH,
    fn: () => {
      sendCurrentRequestToES();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: COMMANDS.OPEN_DOCUMENTATION,
    keys: { win: 'Ctrl-/', mac: 'Command-/' },
    fn: () => {
      openDocumentation();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: COMMANDS.AUTO_INDENT_REQUEST,
    keys: { win: 'Ctrl-I', mac: 'Command-I' },
    fn: () => {
      throttledAutoIndent();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: COMMANDS.MOVE_TO_PREVIOUS_REQUEST,
    keys: { win: 'Ctrl-Up', mac: 'Command-Up' },
    fn: () => {
      senseEditor.moveToPreviousRequestEdge();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: COMMANDS.MOVE_TO_NEXT_REQUEST,
    keys: { win: 'Ctrl-Down', mac: 'Command-Down' },
    fn: () => {
      senseEditor.moveToNextRequestEdge(false);
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: COMMANDS.GO_TO_LINE,
    keys: { win: 'Ctrl-L', mac: 'Command-L' },
    fn: (editor) => {
      const line = parseInt(prompt('Enter line number') ?? '', 10);
      if (!isNaN(line)) {
        editor.gotoLine(line);
      }
    },
  });
}

export function unregisterCommands(senseEditor: SenseEditor) {
  const coreEditor = senseEditor.getCoreEditor();
  Object.values(COMMANDS).forEach((command) => {
    coreEditor.unregisterKeyboardShortcut(command);
  });
}
