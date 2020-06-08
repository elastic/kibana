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

import { map } from 'rxjs/operators';
import { schema, TypeOf } from '@kbn/config-schema';

import {
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
  PluginConfigDescriptor,
  PluginName,
} from 'kibana/server';

const configSchema = schema.object({
  secret: schema.string({ defaultValue: 'Not really a secret :/' }),
  uiProp: schema.string({ defaultValue: 'Accessible from client' }),
});

type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    uiProp: true,
  },
  schema: configSchema,
  deprecations: ({ rename, unused, renameFromRoot }) => [
    rename('securityKey', 'secret'),
    renameFromRoot('oldtestbed.uiProp', 'testbed.uiProp'),
    unused('deprecatedProperty'),
  ],
};

class Plugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Setting up TestBed with core contract [${Object.keys(core)}] and deps [${Object.keys(deps)}]`
    );

    const router = core.http.createRouter();
    router.get(
      { path: '/requestcontext/elasticsearch', validate: false },
      async (context, req, res) => {
        const response = await context.core.elasticsearch.legacy.client.callAsInternalUser('ping');
        return res.ok({ body: `Elasticsearch: ${response}` });
      }
    );

    router.get(
      { path: '/requestcontext/savedobjectsclient', validate: false },
      async (context, req, res) => {
        const response = await context.core.savedObjects.client.find({ type: 'TYPE' });
        return res.ok({ body: `SavedObjects client: ${JSON.stringify(response)}` });
      }
    );

    return {
      data$: this.initializerContext.config.create<ConfigType>().pipe(
        map((configValue) => {
          this.log.debug(`I've got value from my config: ${configValue.secret}`);
          return `Some exposed data derived from config: ${configValue.secret}`;
        })
      ),
      pingElasticsearch: async () => {
        const [coreStart] = await core.getStartServices();
        return coreStart.elasticsearch.legacy.client.callAsInternalUser('ping');
      },
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
