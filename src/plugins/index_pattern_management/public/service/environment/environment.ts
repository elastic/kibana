/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
