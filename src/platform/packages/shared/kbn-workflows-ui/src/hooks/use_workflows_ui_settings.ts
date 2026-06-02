/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  WORKFLOWS_UI_SETTING_ID,
  WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID,
} from '@kbn/workflows';

interface WorkflowsUiSettingsServices {
  settings?: {
    client?: IUiSettingsClient;
  };
  uiSettings?: IUiSettingsClient;
}

export const useWorkflowsUIEnabledSetting = (): boolean => {
  const {
    services: { settings, uiSettings },
  } = useKibana<WorkflowsUiSettingsServices>();
  const uiSettingsClient = settings?.client ?? uiSettings;

  return uiSettingsClient?.get<boolean>(WORKFLOWS_UI_SETTING_ID, true) ?? true;
};

export const useShowManagedWorkflowsSetting = (): boolean => {
  const {
    services: { settings, uiSettings },
  } = useKibana<WorkflowsUiSettingsServices>();
  const uiSettingsClient = settings?.client ?? uiSettings;
  const getShowManagedWorkflows = () =>
    uiSettingsClient?.get<boolean>(WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID, false) ?? false;
  const [showManagedWorkflows, setShowManagedWorkflows] = useState(getShowManagedWorkflows);

  useEffect(() => {
    const subscription = uiSettingsClient
      ?.get$<boolean>(WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID, false)
      .subscribe((showManagedWorkflowSetting) => {
        setShowManagedWorkflows(showManagedWorkflowSetting === true);
      });

    return () => subscription?.unsubscribe();
  }, [uiSettingsClient]);

  return showManagedWorkflows;
};
