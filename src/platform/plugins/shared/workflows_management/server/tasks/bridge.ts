/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { WorkflowsServerPluginSetup } from '../types';

/**
 * The real management API in Kibana, so a tasks entry hands the same instance to its dependents
 * instead of building a second one. A task pod builds its own.
 */
export const workflowsManagementBridge = createTasksKibanaBridge<
  WorkflowsServerPluginSetup,
  Record<string, never>
>();
