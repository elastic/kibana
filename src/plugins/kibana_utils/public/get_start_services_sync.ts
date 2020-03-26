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

import { StartServicesAccessor, CoreStart } from '../../../core/public';

export interface StartServices<Plugins extends object, Core extends object = CoreStart> {
  readonly plugins: Readonly<Partial<Plugins>>;
  readonly core: Readonly<Partial<Core>>;
}

export const getStartServicesSync = <T extends StartServicesAccessor>(
  asyncAccessor: T
): StartServices<T extends StartServicesAccessor<infer P> ? P : never> => {
  const services: StartServices<T extends StartServicesAccessor<infer P> ? P : never> = {
    plugins: {} as T extends StartServicesAccessor<infer P> ? P : never,
    core: {},
  };

  asyncAccessor().then(
    ([asyncCore, asyncPlugins]) => {
      Object.assign(services.core, asyncCore);
      Object.assign(services.plugins, asyncPlugins);
    },
    error => {
      /* eslint-disable no-console */
      console.log('Could not resolve start services.');
      console.error(error);
      /* eslint-enable no-console */
    }
  );

  return services;
};
