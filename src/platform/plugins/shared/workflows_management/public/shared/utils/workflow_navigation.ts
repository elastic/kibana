/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core/public';
import { PLUGIN_ID } from '../../../common';

export interface WorkflowDetailRouteState {
  workflowsListSearch?: string;
}

export const getWorkflowDetailRouteState = (
  workflowsListSearch: string
): WorkflowDetailRouteState | undefined => {
  return workflowsListSearch ? { workflowsListSearch } : undefined;
};

export const getWorkflowsListPathFromDetailRouteState = (
  state: WorkflowDetailRouteState | undefined
): string | undefined => {
  const workflowsListSearch = state?.workflowsListSearch;

  if (!workflowsListSearch) {
    return undefined;
  }

  return workflowsListSearch.startsWith('?') ? workflowsListSearch : `?${workflowsListSearch}`;
};

export const navigateToWorkflowsList = (
  application: ApplicationStart,
  state: WorkflowDetailRouteState | undefined
): Promise<void> => {
  const workflowsListPath = getWorkflowsListPathFromDetailRouteState(state);

  return application.navigateToApp(
    PLUGIN_ID,
    workflowsListPath ? { path: workflowsListPath } : undefined
  );
};

/** Query params for the workflow detail back button to return to the originating app. */
export const RETURN_APP_QUERY_PARAM = 'returnApp';
export const RETURN_PATH_QUERY_PARAM = 'returnPath';

export interface WorkflowReturnDestination {
  returnAppId: string;
  returnPath?: string;
}

export const getReturnDestinationFromSearch = (
  search: string | undefined
): WorkflowReturnDestination | undefined => {
  if (!search) {
    return undefined;
  }

  const params = new URLSearchParams(search);
  const returnApp = params.get(RETURN_APP_QUERY_PARAM);

  if (!returnApp) {
    return undefined;
  }

  const returnPath = params.get(RETURN_PATH_QUERY_PARAM);

  return { returnAppId: returnApp, returnPath: returnPath ?? undefined };
};
