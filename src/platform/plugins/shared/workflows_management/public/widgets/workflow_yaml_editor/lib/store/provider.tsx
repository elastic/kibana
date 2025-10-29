/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { createWorkflowDetailStore } from './store';
import { useKibana } from '../../../../hooks/use_kibana';

/**
 * Provides a workflow detail Redux store context to child components.
 * Creates a new store instance for each provider instance, ensuring isolation.
 */
export function WorkflowDetailStoreProvider({ children }: React.PropsWithChildren) {
  const { services } = useKibana(); // Services are pre-wired in the Kibana services context, they never change.
  const workflowDetailStore = useMemo(() => createWorkflowDetailStore(services), [services]);

  return <Provider store={workflowDetailStore}>{children}</Provider>;
}
