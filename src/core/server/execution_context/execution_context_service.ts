/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreService } from '../../types';
import type { CoreContext } from '../core_context';
import type { Logger } from '../logging';
import type { IExecutionContext } from './execution_context_client';
import { ExecutionContextClient } from './execution_context_client';

// TODO rename to Internal
export interface ExecutionContextSetup {
  client: IExecutionContext;
}

// TODO remove if not usedConfig
export interface ExecutionContextStart {
  client: IExecutionContext;
}

export class ExecutionContextService implements CoreService<ExecutionContextSetup, void> {
  private readonly client: ExecutionContextClient;
  private readonly log: Logger;
  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('execution_context');
    // TODO add a config option to disable the service
    this.client = new ExecutionContextClient();
  }
  setup(): ExecutionContextSetup {
    this.log.debug('setup execution context service');
    return {
      client: this.client,
    };
  }
  // is it used?
  start(): void {}
  stop(): void | Promise<void> {}
}
