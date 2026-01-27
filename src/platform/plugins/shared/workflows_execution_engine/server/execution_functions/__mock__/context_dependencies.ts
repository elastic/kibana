/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';

export const mockContextDependencies = () => ({
  cloudSetup: cloudMock.createSetup(),
  coreStart: coreMock.createStart(),
  actions: actionsMock.createStart(),
  taskManager: taskManagerMock.createStart(),
  workflowsExtensions: workflowsExtensionsMock.createStart(),
});
