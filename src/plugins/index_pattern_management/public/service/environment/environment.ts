/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { MlCardState } from '../../types';

/** @public */
export interface Environment {
  /**
   * Flag whether ml features should be advertised
   */
  readonly ml: () => MlCardState;
}

export class EnvironmentService {
  private environment = {
    ml: () => MlCardState.DISABLED,
  };

  public setup() {
    return {
      /**
       * Update the environment to influence how available features are presented.
       * @param update
       */
      update: (update: Partial<Environment>) => {
        this.environment = Object.assign({}, this.environment, update);
      },
    };
  }

  public getEnvironment() {
    return this.environment;
  }
}

export type EnvironmentServiceSetup = ReturnType<EnvironmentService['setup']>;
