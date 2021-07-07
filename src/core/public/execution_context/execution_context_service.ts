/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreService, KibanaExecutionContext } from '../../types';
import {
  ExecutionContextContainer,
  IExecutionContextContainer,
} from './execution_context_container';

/**
 * @public
 */
export interface ExecutionContextServiceStart {
  /**
   * Creates a context container carrying the meta-data of a runtime operation.
   * Provided meta-data will be propagated to Kibana and Elasticsearch servers.
   * ```js
   * const context = executionContext.create(...);
   * http.fetch('/endpoint/', { context });
   * ```
   */
  create: (context: KibanaExecutionContext) => IExecutionContextContainer;
}

export class ExecutionContextService implements CoreService<void, ExecutionContextServiceStart> {
  setup() {}
  start(): ExecutionContextServiceStart {
    return {
      create(context: KibanaExecutionContext) {
        return new ExecutionContextContainer(context);
      },
    };
  }
  stop() {}
}
