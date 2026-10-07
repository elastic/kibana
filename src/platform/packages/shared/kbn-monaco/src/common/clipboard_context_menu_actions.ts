/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MenuId, MenuRegistry, type MenuItem } from '../monaco_imports';

const CLIPBOARD_ACTION_IDS = new Set([
  'editor.action.clipboardCutAction',
  'editor.action.clipboardCopyAction',
  'editor.action.clipboardPasteAction',
]);

/** Returns Monaco's native clipboard actions for the editor context menu. */
export const getClipboardMenuActions = (): MenuItem[] =>
  MenuRegistry.getMenuItems(MenuId.EditorContext).filter((menuItem) =>
    CLIPBOARD_ACTION_IDS.has(menuItem.command?.id ?? '')
  );

export interface ClipboardContextMenuLabels {
  cut: string;
  copy: string;
  paste: string;
}

/** Applies translated labels to Monaco's native clipboard context menu actions. */
export const setClipboardContextMenuLabels = ({
  cut,
  copy,
  paste,
}: ClipboardContextMenuLabels): void => {
  const actionLabels = new Map([
    ['editor.action.clipboardCutAction', cut],
    ['editor.action.clipboardCopyAction', copy],
    ['editor.action.clipboardPasteAction', paste],
  ]);

  for (const menuItem of getClipboardMenuActions()) {
    if (menuItem.command) {
      const actionLabel = actionLabels.get(menuItem.command.id);
      if (actionLabel) {
        menuItem.command.title = actionLabel;
      }
    }
  }
};
