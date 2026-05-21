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
import { useKibana } from '../hooks/use_kibana';
import { WorkflowExecutionsPage } from '../pages/executions';

export const WorkflowExecutionsRouteGate = React.memo(() => {
  const {
    workflowsManagement: { globalExecutionsView },
  } = useKibana().services;
  const isExecutionsViewEnabled = globalExecutionsView.enabled;

  if (!isExecutionsViewEnabled) {
    return <Redirect to="/" />;
  }

  return <WorkflowExecutionsPage />;
});
WorkflowExecutionsRouteGate.displayName = 'WorkflowExecutionsRouteGate';
