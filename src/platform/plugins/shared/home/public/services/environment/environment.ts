/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @public */
export interface Environment {
  /**
   * Flag whether the home app should advertise cloud features
   */
  readonly cloud: boolean;
  /**
   * Flag whether the home app should advertise apm features
   */
  readonly apmUi: boolean;
  /**
   * Flag whether the home app should advertise ml features
   */
  readonly ml: boolean;
}

export class EnvironmentService {
  private environment = {
    cloud: false,
    apmUi: false,
    ml: false,
  };

  public setup() {
    return {
      /**
       * Update the environment to influence how the home app is presenting available features.
       * This API should not be extended for new features and will be removed in future versions
       * in favor of display specific extension apis.
       * @deprecated
       * @removeBy 8.8.0
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
