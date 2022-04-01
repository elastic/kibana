/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { throttle } from 'lodash';
import { SenseEditor } from '../../../../models/sense_editor';
import { KEYBOARD_SHORTCUT_PREFIX } from '../../../../../../common/constants';

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
    // Prefix names with '__console' which is used to identify the registered keyboard shortcuts in console
    // Ace editor uses camelCase strings for names of the commands
    name: `${KEYBOARD_SHORTCUT_PREFIX}SendToElasticsearch`,
    fn: () => sendCurrentRequestToES(),
  });

  coreEditor.registerKeyboardShortcut({
    name: `${KEYBOARD_SHORTCUT_PREFIX}OpenDocumentation`,
    keys: { win: 'Ctrl-/', mac: 'Command-/' },
    fn: () => {
      openDocumentation();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: `${KEYBOARD_SHORTCUT_PREFIX}AutoIndentRequest`,
    keys: { win: 'Ctrl-I', mac: 'Command-I' },
    fn: () => {
      throttledAutoIndent();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: `${KEYBOARD_SHORTCUT_PREFIX}MoveToPreviousRequestStartOrEnd`,
    keys: { win: 'Ctrl-Up', mac: 'Command-Up' },
    fn: () => {
      senseEditor.moveToPreviousRequestEdge();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: `${KEYBOARD_SHORTCUT_PREFIX}MoveToNextRequestStartOrEnd`,
    keys: { win: 'Ctrl-Down', mac: 'Command-Down' },
    fn: () => {
      senseEditor.moveToNextRequestEdge(false);
    },
  });
}

export function unregisterCommands(senseEditor: SenseEditor) {
  const coreEditor = senseEditor.getCoreEditor();
  coreEditor.unregisterKeyboardShortcuts();
}
