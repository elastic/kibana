/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { instance as registry } from '../../contexts/editor_context/editor_registry';
import { ESRequest } from '../../../types';
import { restoreRequestFromHistory } from './restore_request_from_history';
import { restoreRequestFromHistoryToMonaco } from './restore_request_from_history_to_monaco';

export const useRestoreRequestFromHistory = (isMonacoEnabled: boolean) => {
  return useCallback(
    (req: ESRequest) => {
      if (isMonacoEnabled) {
        restoreRequestFromHistoryToMonaco(req);
      } else {
        const editor = registry.getInputEditor();
        restoreRequestFromHistory(editor, req);
      }
    },
    [isMonacoEnabled]
  );
};
