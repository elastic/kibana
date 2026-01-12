/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicStepDefinition } from './step_registry/types';
import type { WorkflowsExtensionsPublicPluginSetup } from './types';
import type { WorkflowsExtensionsStartContract } from '../common/types';

const createSetupMock: () => jest.Mocked<WorkflowsExtensionsPublicPluginSetup> = () => {
  return {
    registerStepDefinition: jest.fn(),
  };
};

const createStartMock: () => jest.Mocked<
  WorkflowsExtensionsStartContract<PublicStepDefinition>
> = () => {
  return {
    getStepDefinition: jest.fn(),
    hasStepDefinition: jest.fn(),
    getAllStepDefinitions: jest.fn(() => []),
  };
};

export const workflowsExtensionsMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
