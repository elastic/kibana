/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  setClipboardContextMenuLabels,
  getClipboardMenuActions,
} from './clipboard_context_menu_actions';

describe('WHEN the Monaco clipboard contribution is loaded', () => {
  it('SHOULD register localized context menu actions with writable guards', () => {
    setClipboardContextMenuLabels({
      cut: 'Translated Cut',
      copy: 'Translated Copy',
      paste: 'Translated Paste',
    });

    const clipboardActions = getClipboardMenuActions().map((menuItem) => ({
      id: menuItem.command?.id,
      title: menuItem.command?.title,
      when: menuItem.when?.serialize(),
    }));

    expect(clipboardActions).toEqual([
      {
        id: 'editor.action.clipboardCutAction',
        title: 'Translated Cut',
        when: '!editorReadonly',
      },
      {
        id: 'editor.action.clipboardCopyAction',
        title: 'Translated Copy',
        when: undefined,
      },
      {
        id: 'editor.action.clipboardPasteAction',
        title: 'Translated Paste',
        when: '!editorReadonly',
      },
    ]);
  });
});
