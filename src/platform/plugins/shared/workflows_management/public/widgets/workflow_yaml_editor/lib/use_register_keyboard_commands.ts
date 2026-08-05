/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';

interface RegisterKeyboardCommandsParams {
  editor: monaco.editor.IStandaloneCodeEditor;
  openActionsPopover: () => void;
  save: () => void;
  run: () => void;
  saveAndRun: () => void;
  moveStepUp: () => void;
  moveStepDown: () => void;
}

interface UseRegisterKeyboardCommandsReturn {
  registerKeyboardCommands: (params: RegisterKeyboardCommandsParams) => void;
  unregisterKeyboardCommands: () => void;
}

export function useRegisterKeyboardCommands(): UseRegisterKeyboardCommandsReturn {
  const keyboardActions = useRef<monaco.IDisposable[]>([]);

  const unregisterKeyboardCommands = useCallback(() => {
    keyboardActions.current.forEach((action) => action.dispose());
  }, []);

  const registerKeyboardCommands = useCallback(
    (params: RegisterKeyboardCommandsParams) => {
      unregisterKeyboardCommands();

      const { editor, openActionsPopover, save, run, saveAndRun, moveStepUp, moveStepDown } =
        params;

      /**
       * Helper function to wrap action handlers with read-only check
       */
      const withReadOnlyCheck = <T extends unknown[]>(callback: (...args: T) => void) => {
        return (...args: T) => {
          if (editor.getOption(monaco.editor.EditorOption.readOnly) === true) {
            return;
          }
          callback(...args);
        };
      };

      keyboardActions.current = [
        // Toggle comments action
        // This addresses keyboard layout issues where Ctrl+/ doesn't work on non-US layouts
        // See: https://github.com/microsoft/monaco-editor/issues/1233
        // Solution: Register multiple keybindings to cover different keyboard layouts
        editor.addAction({
          id: 'workflows.editor.action.commentLine.toggle',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.toggleLineComment', {
            defaultMessage: 'Toggle line comment',
          }),
          // Multiple keybindings to support different keyboard layouts where / is on different keys
          keybindings: [
            // eslint-disable-next-line no-bitwise
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, // US, UK, and similar layouts
            // eslint-disable-next-line no-bitwise
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Digit7, // German, Turkish, Spanish, Swiss layouts
          ],
          run: withReadOnlyCheck((ed) => {
            ed.trigger('keyboard', 'editor.action.commentLine', null);
          }),
        }),

        // Open the actions popover
        editor.addAction({
          id: 'workflows.editor.action.openActionsPopover',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.openActionsPopover', {
            defaultMessage: 'Open actions popover',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
          run: withReadOnlyCheck(() => {
            openActionsPopover();
          }),
        }),

        // Save action
        editor.addAction({
          id: 'workflows.editor.action.save',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.save', {
            defaultMessage: 'Save',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
          run: withReadOnlyCheck(() => {
            save();
          }),
        }),

        // Run action
        editor.addAction({
          id: 'workflows.editor.action.run',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.run', {
            defaultMessage: 'Run',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: withReadOnlyCheck(() => {
            run();
          }),
        }),

        // Save and Run action
        editor.addAction({
          id: 'workflows.editor.action.saveAndRun',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.saveAndRun', {
            defaultMessage: 'Save and Run',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
          run: withReadOnlyCheck(() => {
            saveAndRun();
          }),
        }),

        // Find & replace
        editor.addAction({
          id: 'workflows.editor.action.findAndReplace',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.findAndReplace', {
            defaultMessage: 'Find & replace',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
          run: withReadOnlyCheck((ed) => {
            ed.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
          }),
        }),

        // Move focused step up
        editor.addAction({
          id: 'workflows.editor.action.moveStepUp',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.moveStepUp', {
            defaultMessage: 'Move step up',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.UpArrow,
          ],
          run: withReadOnlyCheck(() => {
            moveStepUp();
          }),
        }),

        // Move focused step down
        editor.addAction({
          id: 'workflows.editor.action.moveStepDown',
          label: i18n.translate('workflows.workflowDetail.yamlEditor.action.moveStepDown', {
            defaultMessage: 'Move step down',
          }),
          // eslint-disable-next-line no-bitwise
          keybindings: [
            monaco.KeyMod.CtrlCmd |
              monaco.KeyMod.Alt |
              monaco.KeyMod.Shift |
              monaco.KeyCode.DownArrow,
          ],
          run: withReadOnlyCheck(() => {
            moveStepDown();
          }),
        }),
      ];
    },
    [unregisterKeyboardCommands]
  );

  return { registerKeyboardCommands, unregisterKeyboardCommands };
}
