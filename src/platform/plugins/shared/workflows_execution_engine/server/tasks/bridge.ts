/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { WorkflowsExecutionEnginePluginStart } from '../types';

/**
 * The engine the plugin starts in Kibana, which also registers the workflow task types there; a
 * task pod starts its own through its tasks entry.
 */
export const workflowsExecutionEngineBridge = createTasksKibanaBridge<
  { started: true },
  WorkflowsExecutionEnginePluginStart
>();
