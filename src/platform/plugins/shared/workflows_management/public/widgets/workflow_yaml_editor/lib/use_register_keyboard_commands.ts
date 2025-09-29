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
import { useRef } from 'react';

interface RegisterKeyboardCommandsParams {
  editor: monaco.editor.IStandaloneCodeEditor;
  openActionsPopover: () => void;
}

interface UseRegisterKeyboardCommandsReturn {
  registerKeyboardCommands: (params: RegisterKeyboardCommandsParams) => void;
  unregisterKeyboardCommands: () => void;
}

const OPEN_ACTIONS_POPOVER_ACTION_ID = 'openActionsPopover';

export function useRegisterKeyboardCommands(): UseRegisterKeyboardCommandsReturn {
  const actionsMenuAction = useRef<monaco.IDisposable | null>(null);

  const unregisterKeyboardCommands = () => {
    if (actionsMenuAction.current) {
      actionsMenuAction.current.dispose();
    }
  };

  const registerKeyboardCommands = (params: RegisterKeyboardCommandsParams) => {
    unregisterKeyboardCommands();

    const { editor, openActionsPopover } = params;
    // CMD+K shortcut, while focus is on the editor
    actionsMenuAction.current = editor.addAction({
      id: OPEN_ACTIONS_POPOVER_ACTION_ID,
      label: i18n.translate('workflows.workflowDetail.yamlEditor.action.openActionsPopover', {
        defaultMessage: 'Open actions popover',
      }),
      // eslint-disable-next-line no-bitwise
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: openActionsPopover,
    });
  };

  return { registerKeyboardCommands, unregisterKeyboardCommands };
}
