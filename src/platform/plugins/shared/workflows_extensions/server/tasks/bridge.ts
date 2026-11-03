/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { WorkflowsExtensionsTasksSetup, WorkflowsExtensionsTasksStart } from '.';

/**
 * The real step and trigger registries in Kibana, so a tasks entry sees the steps that server
 * plugins registered. A task pod builds its own, filled by the tasks entries of its family.
 */
export const workflowsExtensionsBridge = createTasksKibanaBridge<
  WorkflowsExtensionsTasksSetup,
  Omit<WorkflowsExtensionsTasksStart, 'bindRuntime'>
>();
