/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { SenseEditor } from '../../models';
import { instance as registry } from '../../contexts/editor_context/editor_registry';
import { ESRequest } from '../../../types';
import { restoreRequestFromHistory } from './restore_request_from_history';
import { restoreRequestFromHistoryToMonaco } from './restore_request_from_history_to_monaco';
import { MonacoEditorActionsProvider } from '../../containers/editor/monaco/monaco_editor_actions_provider';

export const useRestoreRequestFromHistory = (isMonacoEnabled: boolean) => {
  return useCallback(
    async (req: ESRequest) => {
      const editor = registry.getInputEditor();
      if (isMonacoEnabled) {
        await restoreRequestFromHistoryToMonaco(editor as MonacoEditorActionsProvider, req);
      } else {
        restoreRequestFromHistory(editor as SenseEditor, req);
      }
    },
    [isMonacoEnabled]
  );
};
