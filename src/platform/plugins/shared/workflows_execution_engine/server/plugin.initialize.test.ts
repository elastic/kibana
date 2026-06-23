/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';

import { WorkflowsExecutionEnginePlugin } from './plugin';

interface InitializeAccessor {
  initialize(coreStart: CoreStart): Promise<void>;
}

const accessInitialize = (plugin: WorkflowsExecutionEnginePlugin): InitializeAccessor =>
  plugin as unknown as InitializeAccessor;

const createPlugin = (): WorkflowsExecutionEnginePlugin => {
  const initializerContext = coreMock.createPluginInitializerContext({
    logging: { console: false },
    eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
  });
  return new WorkflowsExecutionEnginePlugin(initializerContext);
};

describe('WorkflowsExecutionEnginePlugin.initialize', () => {
  it('resolves immediately without Elasticsearch bootstrap work', async () => {
    const plugin = createPlugin();
    const coreStart = coreMock.createStart();

    await expect(accessInitialize(plugin).initialize(coreStart)).resolves.toBeUndefined();
    await expect(accessInitialize(plugin).initialize(coreStart)).resolves.toBeUndefined();
  });
});
