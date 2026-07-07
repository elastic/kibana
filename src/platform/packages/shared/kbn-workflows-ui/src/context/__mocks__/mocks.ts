/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import type { WorkflowsUiServices } from '../workflows_ui_services';

/**
 * Builds {@link WorkflowsUiServices} for tests from the plugins' own contract
 * mocks, so the shapes stay in sync with the real start contracts (a package can
 * import a plugin's published `/mocks` entrypoint — this is what the
 * `workflows_management` plugin does for the same two contracts).
 *
 * Registry lookups are empty by default (icons fall back to the static set).
 * Override the individual `workflowsExtensions` jest mocks or register an action
 * type on `triggersActionsUi.actionTypeRegistry` to exercise the dynamic-icon
 * paths.
 */
export const createMockWorkflowsUiServices = (): WorkflowsUiServices => ({
  workflowsExtensions: workflowsExtensionsMock.createStart(),
  triggersActionsUi: triggersActionsUiMock.createStart(),
});
