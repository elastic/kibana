/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WorkflowApi } from './workflows_api';

/**
 * Returns a memoized `WorkflowApi` instance wired to the current Kibana HTTP service.
 *
 * @example
 * ```ts
 * const api = useWorkflowsApi();
 * const workflows = await api.getWorkflows({ page: 1, size: 20 });
 * ```
 */
export const useWorkflowsApi = (): WorkflowApi => {
  const { services } = useKibana<{ http: HttpStart }>();
  return useMemo(() => new WorkflowApi(services.http), [services.http]);
};
