/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY } from 'rxjs';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useObservable } from '@kbn/use-observable';
import { WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';

interface LibraryEnabledServices {
  settings?: {
    globalClient?: IUiSettingsClient;
  };
}

/**
 * Returns whether the Workflow Template Library tech preview is enabled, reading
 * the global (not per-space) `workflowsManagement:library:enabled` uiSetting.
 * Reactive — re-renders when an admin flips the setting. Works from any plugin
 * via core's `settings.globalClient` (no dependency on `workflows_management`).
 */
export function useLibraryEnabled(): boolean {
  const {
    services: { settings },
  } = useKibana<LibraryEnabledServices>();
  const client = settings?.globalClient;

  const observable = client?.get$<boolean>(WORKFLOWS_LIBRARY_ENABLED_SETTING_ID, false) ?? EMPTY;
  const defaultValue = client?.get<boolean>(WORKFLOWS_LIBRARY_ENABLED_SETTING_ID, false) ?? false;

  return useObservable(observable, defaultValue) === true;
}
