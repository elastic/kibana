/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowSettings } from '@kbn/workflows';

/** Default workflow `settings.timeout` when the definition omits it. */
export const DEFAULT_WORKFLOW_TIMEOUT = '6h';

export const defaultWorkflowSettings: WorkflowSettings = {
  timeout: DEFAULT_WORKFLOW_TIMEOUT,
};
