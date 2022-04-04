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
    name: 'send to Elasticsearch',
    fn: () => {
      sendCurrentRequestToES();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'open documentation',
    keys: { win: 'Ctrl-/', mac: 'Command-/' },
    fn: () => {
      openDocumentation();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'auto indent request',
    keys: { win: 'Ctrl-I', mac: 'Command-I' },
    fn: () => {
      throttledAutoIndent();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'move to previous request start or end',
    keys: { win: 'Ctrl-Up', mac: 'Command-Up' },
    fn: () => {
      senseEditor.moveToPreviousRequestEdge();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'move to next request start or end',
    keys: { win: 'Ctrl-Down', mac: 'Command-Down' },
    fn: () => {
      senseEditor.moveToNextRequestEdge(false);
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'gotoline',
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
  const commands = [
    'send to Elasticsearch',
    'open documentation',
    'auto indent request',
    'move to previous request start or end',
    'move to next request start or end',
    'gotoline',
  ];
  commands.forEach((command) => {
    coreEditor.unregisterKeyboardShortcut(command);
  });
}
