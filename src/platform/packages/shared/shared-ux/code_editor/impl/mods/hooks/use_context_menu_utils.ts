/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { setClipboardContextMenuLabels, type monaco } from '@kbn/monaco';

setClipboardContextMenuLabels({
  cut: i18n.translate('sharedUXPackages.codeEditor.contextMenuAction.cutActionLabel', {
    defaultMessage: 'Cut',
  }),
  copy: i18n.translate('sharedUXPackages.codeEditor.contextMenuAction.copyActionLabel', {
    defaultMessage: 'Copy',
  }),
  paste: i18n.translate('sharedUXPackages.codeEditor.contextMenuAction.pasteActionLabel', {
    defaultMessage: 'Paste',
  }),
});

interface RegisterContextMenuActionsParams {
  editor: monaco.editor.IStandaloneCodeEditor;
  enableWriteActions: boolean;
  customActions?: ContextMenuAction[];
}

export interface ContextMenuAction {
  actionDescriptor: monaco.editor.IActionDescriptor;
  writeAction: boolean;
}

type RegisteredAction = ContextMenuAction & {
  refObject: { current: monaco.IDisposable | null };
};

/**
 * Hook that returns a function for registering context menu actions in the Monaco editor.
 */
export const useContextMenuUtils = () => {
  let registeredActions: RegisteredAction[] = [];

  const disposeAllActions = () => {
    registeredActions.forEach(({ refObject }) => {
      refObject.current?.dispose();
    });
    registeredActions = [];
  };

  const registerContextMenuActions = ({
    editor,
    enableWriteActions,
    customActions = [],
  }: RegisterContextMenuActionsParams) => {
    disposeAllActions();

    registeredActions = customActions.map(({ actionDescriptor, writeAction }) => {
      const refObject = { current: null as monaco.IDisposable | null };

      if (!writeAction || enableWriteActions) {
        refObject.current = editor.addAction(actionDescriptor);
      }

      return { actionDescriptor, writeAction, refObject };
    });
  };

  return {
    registerContextMenuActions,
    unregisterContextMenuActions: disposeAllActions,
  };
};
