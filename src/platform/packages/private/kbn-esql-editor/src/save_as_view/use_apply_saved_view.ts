/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { getViewEsqlQuery, getViews } from '@kbn/esql-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEsqlEditorActions } from '../editor_actions_context';
import type { ESQLEditorDeps } from '../types';

/**
 * Refreshes the cached ES|QL views list, then replaces the editor query with
 * `FROM <view>` and runs it. Validation reads that cache, so a newly created
 * view is unknown until the list is fetched again.
 */
export const useApplySavedView = (): ((viewName: string) => Promise<void>) => {
  const editorActions = useEsqlEditorActions();
  const {
    services: { core },
  } = useKibana<ESQLEditorDeps>();

  return useCallback(
    async (viewName: string) => {
      try {
        await getViews.call({ forceRefresh: true }, core.http);
      } catch {
        // Still switch to the view if the refresh fails. The editor can recover
        // on the next validation pass.
      }
      editorActions?.submitEsqlQuery(getViewEsqlQuery(viewName));
    },
    [core.http, editorActions]
  );
};
