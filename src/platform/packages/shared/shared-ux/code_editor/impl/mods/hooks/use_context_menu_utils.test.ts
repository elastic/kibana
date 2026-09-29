/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { useContextMenuUtils } from './use_context_menu_utils';

const CLIPBOARD_GROUP = '9_cutcopypaste';

const registerBuiltInMonacoClipboardActions = (editor: monaco.editor.IStandaloneCodeEditor) => {
  const builtIn = [
    { id: 'editor.action.clipboardCutAction', label: 'Cut', order: 1.5 },
    { id: 'editor.action.clipboardCopyAction', label: 'Copy', order: 1.6 },
    { id: 'editor.action.clipboardPasteAction', label: 'Paste', order: 1.7 },
  ];

  for (const action of builtIn) {
    editor.addAction({
      id: action.id,
      label: action.label,
      contextMenuGroupId: CLIPBOARD_GROUP,
      contextMenuOrder: action.order,
      run: () => {},
    });
  }
};

describe('WHEN Monaco clipboard actions are already registered', () => {
  it('SHOULD not add duplicate clipboard actions to the context menu group', () => {
    const registered: Array<{ id: string; label: string }> = [];
    const editor = {
      addAction: (descriptor: monaco.editor.IActionDescriptor) => {
        if (descriptor.contextMenuGroupId === CLIPBOARD_GROUP) {
          registered.push({ id: descriptor.id, label: descriptor.label });
        }
        return { dispose: jest.fn() };
      },
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    registerBuiltInMonacoClipboardActions(editor);

    const { registerContextMenuActions } = useContextMenuUtils();
    registerContextMenuActions({
      editor,
      enableWriteActions: true,
    });

    const labelCounts = registered.reduce<Record<string, number>>((counts, action) => {
      counts[action.label] = (counts[action.label] ?? 0) + 1;
      return counts;
    }, {});

    expect(labelCounts).toEqual({
      Cut: 1,
      Copy: 1,
      Paste: 1,
    });
  });
});
