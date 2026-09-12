/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createMockWorkflowsUiServices } from './mocks';
import type { WorkflowsUiServicesProviderProps } from '../workflows_ui_services';

/**
 * Jest manual mock for `../workflows_ui_services`. Activated with a single line
 * (`jest.mock('../../context/workflows_ui_services')`) so component tests don't
 * need to wrap the tree in the real provider. Defaults to empty registries;
 * override per test via `jest.mocked(useWorkflowsUiServices).mockReturnValue(...)`.
 */
export const useWorkflowsUiServices = jest.fn(() => createMockWorkflowsUiServices());

// Passthrough so a test that still renders the provider does not blow up.
export const WorkflowsUiServicesProvider = ({ children }: WorkflowsUiServicesProviderProps) => (
  <>{children}</>
);
