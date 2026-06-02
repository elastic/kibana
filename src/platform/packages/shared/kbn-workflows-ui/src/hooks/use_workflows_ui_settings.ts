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

export const useWorkflowsUIEnabledSetting = (): boolean => {
  const {
    services: { uiSettings },
  } = useKibana<{ uiSettings: IUiSettingsClient }>();

  return uiSettings?.get<boolean>(WORKFLOWS_UI_SETTING_ID, true);
};

export const useShowManagedWorkflowsSetting = (): boolean => {
  const {
    services: { uiSettings },
  } = useKibana<{ uiSettings: IUiSettingsClient }>();
  const [showManagedWorkflows, setShowManagedWorkflows] = useState(
    () => uiSettings?.get<boolean>(WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID, false) ?? false
  );

  useEffect(() => {
    const subscription = uiSettings?.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID) {
        setShowManagedWorkflows(newValue === true);
      }
    });

    return () => subscription?.unsubscribe();
  }, [uiSettings]);

  return showManagedWorkflows;
};
