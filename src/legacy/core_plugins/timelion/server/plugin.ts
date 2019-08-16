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
import { Legacy } from 'kibana';
import { i18n } from '@kbn/i18n';
import { PluginInitializerContext, CoreSetup } from 'kibana/server';

import loadFunctions, { LoadFunctions } from './lib/load_functions';
import { initRoutes } from './routes';

function getFunction(functions: LoadFunctions, name: string) {
  if (functions[name]) {
    return functions[name];
  }

  throw new Error(
    i18n.translate('timelion.noFunctionErrorMessage', {
      defaultMessage: 'No such function: {name}',
      values: { name },
    })
  );
}

// TODO: Remove as CoreSetup is completed.
export interface CustomCoreSetup {
  http: {
    server: Legacy.Server;
  };
}

export class TimelionServerPlugin {
  public initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup & CustomCoreSetup) {
    const { server } = core.http;
    const functions = loadFunctions('series_functions');

    server.expose('functions', functions);
    server.expose('getFunction', (name: string) => getFunction(functions, name));

    initRoutes(server);
  }
}
