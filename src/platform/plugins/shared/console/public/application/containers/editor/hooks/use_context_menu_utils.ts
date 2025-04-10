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

interface RegisterContextMenuActionsParams {
  /** The current Monaco editor instance. */
  editor: monaco.editor.IStandaloneCodeEditor;
  /** Specifies whether to register write actions (e.g. Cut and Paste) that modify the text in the editor. */
  enableWriteActions: boolean;
}

const CUT_ACTION_ID = 'cutAction';
const COPY_ACTION_ID = 'copyAction';
const PASTE_ACTION_ID = 'pasteAction';

/**
 * Hook that returns a function for adding context menu actions in the editor.
 *
 * @param params The {@link RegisterContextMenuActionsParams} to use.
 */
export const useContextMenuUtils = () => {
  const cutAction = useRef<monaco.IDisposable | null>(null);
  const copyAction = useRef<monaco.IDisposable | null>(null);
  const pasteAction = useRef<monaco.IDisposable | null>(null);

  const disposeAllActions = () => {
    if (cutAction.current) {
      cutAction.current?.dispose();
    }
    if (copyAction.current) {
      copyAction.current?.dispose();
    }
    if (pasteAction.current) {
      pasteAction.current?.dispose();
    }
  };

  const registerContextMenuActions = (params: RegisterContextMenuActionsParams) => {
    const { editor, enableWriteActions } = params;

    disposeAllActions();

    if (enableWriteActions) {
      cutAction.current = editor.addAction({
        id: CUT_ACTION_ID,
        label: i18n.translate('console.contextMenuAction.cutActionLabel', {
          defaultMessage: 'Cut',
        }),
        // eslint-disable-next-line no-bitwise
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
        contextMenuGroupId: '9_cutcopypaste',
        contextMenuOrder: 1,
        run: async (ed) => {
          const selection = ed.getSelection();
          const model = ed.getModel();
          const selectedText = model.getValueInRange(selection);

          try {
            if (!window.navigator?.clipboard) {
              throw new Error('Could not copy to clipboard!');
            }

            await window.navigator.clipboard.writeText(selectedText);

            editor.executeEdits('Cut selection', [
              {
                range: selection,
                text: '',
              },
            ]);
          } catch (e) {
            alert(
              i18n.translate('console.contextMenuAction.cutActionFailedMessage', {
                defaultMessage: 'Could not cut selected text to clipboard',
              })
            );
          }
        },
      });
    }

    copyAction.current = editor.addAction({
      id: COPY_ACTION_ID,
      label: i18n.translate('console.contextMenuAction.copyActionLabel', {
        defaultMessage: 'Copy',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 2,
      run: async (ed) => {
        const selection = ed.getSelection();
        const model = ed.getModel();
        const selectedText = model.getValueInRange(selection);
        try {
          if (!window.navigator?.clipboard) {
            throw new Error('Could not copy to clipboard!');
          }

          await window.navigator.clipboard.writeText(selectedText);
        } catch (e) {
          alert(
            i18n.translate('console.contextMenuAction.copyActionFailedMessage', {
              defaultMessage: 'Could not copy selected text to clipboard',
            })
          );
        }
      },
    });

    if (enableWriteActions) {
      pasteAction.current = editor.addAction({
        id: PASTE_ACTION_ID,
        label: i18n.translate('console.contextMenuAction.pasteActionLabel', {
          defaultMessage: 'Paste',
        }),
        // eslint-disable-next-line no-bitwise
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
        contextMenuGroupId: '9_cutcopypaste',
        contextMenuOrder: 3,
        run: async (ed) => {
          const selection = ed.getSelection();

          try {
            if (!window.navigator?.clipboard) {
              throw new Error('Could not paste from clipboard!');
            }

            const clipboardText = await window.navigator.clipboard.readText();
            if (clipboardText != null) {
              editor.executeEdits('Paste from clipboard', [
                {
                  range: selection,
                  text: clipboardText,
                },
              ]);
            }
          } catch (e) {
            alert(
              i18n.translate('console.contextMenuAction.pasteActionFailedMessage', {
                defaultMessage: 'Could not paste from clipboard',
              })
            );
          }
        },
      });
    }
  };

  const unregisterContextMenuActions = () => disposeAllActions();

  return { registerContextMenuActions, unregisterContextMenuActions };
};
