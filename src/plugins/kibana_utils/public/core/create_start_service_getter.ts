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

import { CoreStart, StartServicesAccessor } from '../../../../core/public';

export interface StartServices<Plugins = unknown, OwnContract = unknown> {
  plugins: Plugins;
  self: OwnContract;
  core: CoreStart;
}

export type StartServicesGetter<Plugins = unknown, OwnContract = unknown> = () => StartServices<
  Plugins,
  OwnContract
>;

export const createStartServicesGetter = <TPluginsStart extends object, TStart>(
  accessor: StartServicesAccessor<TPluginsStart, TStart>
): StartServicesGetter<TPluginsStart, TStart> => {
  let services: StartServices<TPluginsStart, TStart> | undefined;

  accessor().then(
    ([core, plugins, self]) => {
      services = {
        core,
        plugins,
        self,
      };
    },
    error => {
      // eslint-disable-next-line no-console
      console.error('Could not access start services.', error);
    }
  );

  return () => {
    if (!services) throw new Error('Trying to access start services before start.');
    return services;
  };
};
