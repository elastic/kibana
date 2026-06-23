/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows/common/constants';
import { WorkflowExecutionsPage } from '../pages/executions';

export const WorkflowExecutionsRouteGate = React.memo(() => {
  const isExperimentalFeaturesEnabled = useUiSetting<boolean>(
    WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );

  if (!isExperimentalFeaturesEnabled) {
    return <Redirect to="/" />;
  }

  return <WorkflowExecutionsPage />;
});
WorkflowExecutionsRouteGate.displayName = 'WorkflowExecutionsRouteGate';
