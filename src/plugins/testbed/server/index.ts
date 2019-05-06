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

import {
  Logger,
  PluginInitializerContext,
  PluginName,
  PluginSetupContext,
  PluginStartContext,
} from 'kibana/server';
import { TestBedConfig } from './config';

class Plugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public setup(setupContext: PluginSetupContext, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Setting up TestBed with core contract [${Object.keys(setupContext)}] and deps [${Object.keys(
        deps
      )}]`
    );

    return {
      data$: this.initializerContext.config.create(TestBedConfig).pipe(
        map(config => {
          this.log.debug(`I've got value from my config: ${config.secret}`);
          return `Some exposed data derived from config: ${config.secret}`;
        })
      ),
      pingElasticsearch$: setupContext.elasticsearch.adminClient$.pipe(
        mergeMap(client => client.callAsInternalUser('ping'))
      ),
    };
  }

  public start(startContext: PluginStartContext, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Starting up TestBed testbed with core contract [${Object.keys(
        startContext
      )}] and deps [${Object.keys(deps)}]`
    );

    return {
      getStartContext() {
        return startContext;
      },
    };
  }

  public stop() {
    this.log.debug(`Stopping TestBed`);
  }
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
