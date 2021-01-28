/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useCallback } from 'react';
import { instance as registry } from '../../contexts/editor_context/editor_registry';
import { restoreRequestFromHistory } from './restore_request_from_history';

export const useRestoreRequestFromHistory = () => {
  return useCallback((req: any) => {
    const editor = registry.getInputEditor();
    restoreRequestFromHistory(editor, req);
  }, []);
};
