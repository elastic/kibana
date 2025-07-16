/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { copyToClipboard } from '@elastic/eui';

interface RegisterContextMenuActionsParams {
  editor: monaco.editor.IStandaloneCodeEditor;
  enableWriteActions: boolean;
  customActions?: ContextMenuAction[];
}

export interface ContextMenuAction {
  actionDescriptor: monaco.editor.IActionDescriptor;
  writeAction: boolean;
}

const CUT_ACTION_ID = 'cutAction';
const COPY_ACTION_ID = 'copyAction';
const PASTE_ACTION_ID = 'pasteAction';

const DEFAULT_ACTIONS: ContextMenuAction[] = [
  {
    actionDescriptor: {
      id: CUT_ACTION_ID,
      label: i18n.translate('sharedUXPackages.codeEditor.contextMenuAction.cutActionLabel', {
        defaultMessage: 'Cut',
      }),
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1,
      run: async (ed) => {
        const selection = ed.getSelection();
        const model = ed.getModel();
        if (selection && model) {
          const selectedText = model.getValueInRange(selection);
          copyToClipboard(selectedText);
          ed.executeEdits('Cut selection', [{ range: selection, text: '' }]);
        }
      },
    },
    writeAction: true,
  },
  {
    actionDescriptor: {
      id: COPY_ACTION_ID,
      label: i18n.translate('sharedUXPackages.codeEditor.contextMenuAction.copyActionLabel', {
        defaultMessage: 'Copy',
      }),
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 2,
      run: async (ed) => {
        const selection = ed.getSelection();
        const model = ed.getModel();
        if (selection && model) {
          const selectedText = model.getValueInRange(selection);
          copyToClipboard(selectedText);
        }
      },
    },
    writeAction: false,
  },
  {
    actionDescriptor: {
      id: PASTE_ACTION_ID,
      label: i18n.translate('sharedUXPackages.codeEditor.contextMenuAction.pasteActionLabel', {
        defaultMessage: 'Paste',
      }),
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 3,
      run: async (ed) => {
        const selection = ed.getSelection();
        if (selection) {
          const clipboardText = await navigator.clipboard?.readText();
          if (clipboardText) {
            ed.executeEdits('Paste from clipboard', [{ range: selection, text: clipboardText }]);
          }
        }
      },
    },
    writeAction: true,
  },
];

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

    const allActions = [...DEFAULT_ACTIONS, ...customActions];

    registeredActions = allActions.map(({ actionDescriptor, writeAction }) => {
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
