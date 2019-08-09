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

import { map, mergeMap } from 'rxjs/operators';
import { schema, TypeOf } from '@kbn/config-schema';

import { CoreSetup, CoreStart, Logger, PluginInitializerContext, PluginName } from 'kibana/server';

export const config = {
  schema: schema.object({
    secret: schema.string({ defaultValue: 'Not really a secret :/' }),
  }),
};

type ConfigType = TypeOf<typeof config.schema>;

class Plugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Setting up TestBed with core contract [${Object.keys(core)}] and deps [${Object.keys(deps)}]`
    );

    return {
      data$: this.initializerContext.config.create<ConfigType>().pipe(
        map(configValue => {
          this.log.debug(`I've got value from my config: ${configValue.secret}`);
          return `Some exposed data derived from config: ${configValue.secret}`;
        })
      ),
      pingElasticsearch$: core.elasticsearch.adminClient$.pipe(
        mergeMap(client => client.callAsInternalUser('ping'))
      ),
    };
  }

  public start(core: CoreStart, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Starting up TestBed testbed with core contract [${Object.keys(
        core
      )}] and deps [${Object.keys(deps)}]`
    );

    return {
      getStartContext() {
        return core;
      },
    };
  }

  public stop() {
    this.log.debug(`Stopping TestBed`);
  }
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
