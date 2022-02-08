/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreService } from '../../types';

/** @public */
export interface ExecutionContextSetup {
  set(c$: Record<string, any>): void;
  getAll(): Record<string, any>;
  clear(): void;
}

/**
 * See {@link ExecutionContextSetup}.
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;

/** @internal */
export class ExecutionContextService implements CoreService<ExecutionContextSetup, ExecutionContextStart> {
  private context: Record<string, any> = {};

  public setup() {
    return {
      clear: () => {
        this.context = {};
      },
      set: (c: Record<string, any>) => {
        this.context = {
          ...this.context,
          ...c
        } 
      }, 
      getAll: () => {
        return {
          app: this.context
        }
      }
    };
  }

  public start() {
    return this.setup();
  }

  public stop() {
  }
}
