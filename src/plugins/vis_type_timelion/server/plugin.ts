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

import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import { TypeOf, schema } from '@kbn/config-schema';
import { RecursiveReadonly } from '@kbn/utility-types';

import { CoreSetup, PluginInitializerContext } from '../../../../src/core/server';
import { deepFreeze } from '../../../../src/core/server';
import { configSchema } from '../config';
import loadFunctions from './lib/load_functions';
import { functionsRoute } from './routes/functions';
import { validateEsRoute } from './routes/validate_es';
import { runRoute } from './routes/run';
import { ConfigManager } from './lib/config_manager';

const experimentalLabel = i18n.translate('timelion.uiSettings.experimentalLabel', {
  defaultMessage: 'experimental',
});

/**
 * Describes public Timelion plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  uiEnabled: boolean;
}

/**
 * Represents Timelion Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup): Promise<RecursiveReadonly<PluginSetupContract>> {
    const config = await this.initializerContext.config
      .create<TypeOf<typeof configSchema>>()
      .pipe(first())
      .toPromise();

    const configManager = new ConfigManager(this.initializerContext.config);

    const functions = loadFunctions('series_functions');

    const getFunction = (name: string) => {
      if (functions[name]) {
        return functions[name];
      }

      throw new Error(
        i18n.translate('timelion.noFunctionErrorMessage', {
          defaultMessage: 'No such function: {name}',
          values: { name },
        })
      );
    };

    const logger = this.initializerContext.logger.get('timelion');

    const router = core.http.createRouter();

    const deps = {
      configManager,
      functions,
      getFunction,
      logger,
    };

    functionsRoute(router, deps);
    runRoute(router, deps);
    validateEsRoute(router);

    core.uiSettings.register({
      'timelion:es.timefield': {
        name: i18n.translate('timelion.uiSettings.timeFieldLabel', {
          defaultMessage: 'Time field',
        }),
        value: '@timestamp',
        description: i18n.translate('timelion.uiSettings.timeFieldDescription', {
          defaultMessage: 'Default field containing a timestamp when using {esParam}',
          values: { esParam: '.es()' },
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
      'timelion:es.default_index': {
        name: i18n.translate('timelion.uiSettings.defaultIndexLabel', {
          defaultMessage: 'Default index',
        }),
        value: '_all',
        description: i18n.translate('timelion.uiSettings.defaultIndexDescription', {
          defaultMessage: 'Default elasticsearch index to search with {esParam}',
          values: { esParam: '.es()' },
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
      'timelion:target_buckets': {
        name: i18n.translate('timelion.uiSettings.targetBucketsLabel', {
          defaultMessage: 'Target buckets',
        }),
        value: 200,
        description: i18n.translate('timelion.uiSettings.targetBucketsDescription', {
          defaultMessage: 'The number of buckets to shoot for when using auto intervals',
        }),
        category: ['timelion'],
        schema: schema.number(),
      },
      'timelion:max_buckets': {
        name: i18n.translate('timelion.uiSettings.maximumBucketsLabel', {
          defaultMessage: 'Maximum buckets',
        }),
        value: 2000,
        description: i18n.translate('timelion.uiSettings.maximumBucketsDescription', {
          defaultMessage: 'The maximum number of buckets a single datasource can return',
        }),
        category: ['timelion'],
        schema: schema.number(),
      },
      'timelion:min_interval': {
        name: i18n.translate('timelion.uiSettings.minimumIntervalLabel', {
          defaultMessage: 'Minimum interval',
        }),
        value: '1ms',
        description: i18n.translate('timelion.uiSettings.minimumIntervalDescription', {
          defaultMessage: 'The smallest interval that will be calculated when using "auto"',
          description:
            '"auto" is a technical value in that context, that should not be translated.',
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
      'timelion:graphite.url': {
        name: i18n.translate('timelion.uiSettings.graphiteURLLabel', {
          defaultMessage: 'Graphite URL',
          description:
            'The URL should be in the form of https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite',
        }),
        value: config.graphiteUrls && config.graphiteUrls.length ? config.graphiteUrls[0] : null,
        description: i18n.translate('timelion.uiSettings.graphiteURLDescription', {
          defaultMessage:
            '{experimentalLabel} The <a href="https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite" target="_blank" rel="noopener">URL</a> of your graphite host',
          values: { experimentalLabel: `<em>[${experimentalLabel}]</em>` },
        }),
        type: 'select',
        options: config.graphiteUrls || [],
        category: ['timelion'],
        schema: schema.nullable(schema.string()),
      },
      'timelion:quandl.key': {
        name: i18n.translate('timelion.uiSettings.quandlKeyLabel', {
          defaultMessage: 'Quandl key',
        }),
        value: 'someKeyHere',
        description: i18n.translate('timelion.uiSettings.quandlKeyDescription', {
          defaultMessage: '{experimentalLabel} Your API key from www.quandl.com',
          values: { experimentalLabel: `<em>[${experimentalLabel}]</em>` },
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
    });

    return deepFreeze({ uiEnabled: config.ui.enabled });
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting plugin');
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping plugin');
  }
}
