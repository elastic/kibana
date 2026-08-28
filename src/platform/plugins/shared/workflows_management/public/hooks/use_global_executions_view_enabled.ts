/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY } from 'rxjs';
import { useObservable } from '@kbn/use-observable';
import { WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID } from '@kbn/workflows/common/constants';
import { useKibana } from './use_kibana';

/**
 * Returns whether the global Workflow Executions view is enabled, reading the
 * global (not per-space) `workflowsManagement:globalExecutionsView:enabled`
 * uiSetting. Reactive — re-renders when an admin flips the setting.
 */
export function useGlobalExecutionsViewEnabled(): boolean {
  const {
    services: { settings },
  } = useKibana();
  const client = settings?.globalClient;

  const observable =
    client?.get$<boolean>(WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID, false) ?? EMPTY;
  const defaultValue =
    client?.get<boolean>(WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID, false) ?? false;

  return useObservable(observable, defaultValue) === true;
}
