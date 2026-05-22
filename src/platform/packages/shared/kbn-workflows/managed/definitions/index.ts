/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EXAMPLE_MANAGED_WORKFLOW } from './workflows_extensions_example';

export { EXAMPLE_MANAGED_WORKFLOW_ID } from './workflows_extensions_example';

export const managedWorkflowDefinitions = [EXAMPLE_MANAGED_WORKFLOW] as const;
