/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { WORKFLOWS_ALERT_EVENT_TYPE, WORKFLOWS_DOCUMENT_EVENT_TYPE } from '@kbn/workflows';
import { WorkflowsExtensionsServerPlugin } from './plugin';
import type {
  WorkflowsExtensionsServerPluginSetupDeps,
  WorkflowsExtensionsServerPluginStartDeps,
} from './types';

describe('WorkflowsExtensionsServerPlugin', () => {
  it('always exposes the generic alert and document event definitions', () => {
    const plugin = new WorkflowsExtensionsServerPlugin(coreMock.createPluginInitializerContext());
    plugin.setup(coreMock.createSetup(), {} as WorkflowsExtensionsServerPluginSetupDeps);

    const start = plugin.start(
      coreMock.createStart(),
      {} as WorkflowsExtensionsServerPluginStartDeps
    );

    expect(start.hasManualWorkflowEventDefinition(WORKFLOWS_ALERT_EVENT_TYPE)).toBe(true);
    expect(start.hasManualWorkflowEventDefinition(WORKFLOWS_DOCUMENT_EVENT_TYPE)).toBe(true);
  });
});
