/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import { PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { DiscoverServerPluginStart, DiscoverServerPluginStartDeps } from '.';
import { DiscoverAppLocatorDefinition } from '../common';
import { capabilitiesProvider } from './capabilities_provider';
import { createSearchEmbeddableFactory } from './embeddable';
import { initializeLocatorServices } from './locator';
import { registerSampleData } from './sample_data';
import { getUiSettings } from './ui_settings';
import type { ConfigSchema } from './config';

export class DiscoverServerPlugin
  implements Plugin<object, DiscoverServerPluginStart, object, DiscoverServerPluginStartDeps>
{
  private readonly config: ConfigSchema;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.config = initializerContext.config.get();
  }

  public setup(
    core: CoreSetup,
    plugins: {
      data: DataPluginSetup;
      embeddable: EmbeddableSetup;
      home?: HomeServerPluginSetup;
      share?: SharePluginSetup;
    }
  ) {
    core.capabilities.registerProvider(capabilitiesProvider);
    core.uiSettings.register(getUiSettings(core.docLinks, this.config.enableUiSettingsValidations));

    if (plugins.home) {
      registerSampleData(plugins.home.sampleData);
    }

    if (plugins.share) {
      plugins.share.url.locators.create(
        new DiscoverAppLocatorDefinition({ useHash: false, setStateToKbnUrl })
      );
    }

    const router = core.http.createRouter();
    router.post(
      {
        path: '/api/add_runtime_field',
        validate: {
          body: schema.object({
            indexPattern: schema.string(),
            fieldName: schema.string(),
            fieldType: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        // expand index pattern into list of indices
        const matchingIndices = await esClient.transport.request<Record<string, unknown>>({
          method: 'GET',
          path: `/${request.body.indexPattern}`,
        });

        const indices: string[] = Object.keys(matchingIndices);

        await Promise.all(
          indices.map(async (index) => {
            await esClient.transport.request({
              method: 'PUT',
              path: `${index}/_mapping`,
              body: {
                runtime: {
                  [request.body.fieldName]: {
                    type: request.body.fieldType,
                  },
                },
              },
            });
          })
        );
        return response.ok({
          body: {
            field: request.body.fieldName,
            type: request.body.fieldType,
          },
        });
      }
    );

    router.post(
      {
        path: '/api/remove_runtime_field',
        validate: {
          body: schema.object({
            indexPattern: schema.string(),
            fieldName: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        // expand index pattern into list of indices
        const matchingIndices = await esClient.transport.request<Record<string, unknown>>({
          method: 'GET',
          path: `/${request.body.indexPattern}`,
        });

        const indices: string[] = Object.keys(matchingIndices);

        await Promise.all(
          indices.map(async (index) => {
            await esClient.transport.request({
              method: 'PUT',
              path: `${index}/_mapping`,
              body: {
                runtime: {
                  [request.body.fieldName]: null,
                },
              },
            });
          })
        );
        return response.ok({
          body: {
            field: request.body.fieldName,
          },
        });
      }
    );
    router.post(
      {
        path: '/api/value_field_suggest',
        validate: {
          body: schema.object({
            indexPattern: schema.string(),
            valuePrefix: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const r = await esClient.transport.request<{
          hits: { hits: Array<{ _source: Record<string, unknown> }> };
        }>({
          method: 'GET',
          path: `${request.body.indexPattern}/_search`,
          body: {
            size: 100,
            query: {
              bool: {
                filter: [
                  {
                    query_string: {
                      query: `${request.body.valuePrefix}*`,
                    },
                  },
                ],
              },
            },
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });
        const docs = r.hits.hits;

        const matchingFieldValuePairs = new Map<string, Set<string>>();

        for (const doc of docs) {
          for (const [key, value] of Object.entries(doc._source)) {
            const stringValue = String(value);
            if (stringValue.startsWith(request.body.valuePrefix)) {
              const values = matchingFieldValuePairs.get(key) ?? new Set<string>();
              values.add(stringValue);
              matchingFieldValuePairs.set(key, values);
            }
          }
        }

        // compile list of suggestions (<field>: "<value>")
        const suggestions = [];
        for (const [field, values] of matchingFieldValuePairs) {
          for (const value of values) {
            suggestions.push(`${field} == "${value}"`);
          }
        }

        return response.ok({
          body: {
            suggestions,
          },
        });
      }
    );

    plugins.embeddable.registerEmbeddableFactory(createSearchEmbeddableFactory());

    return {};
  }

  public start(core: CoreStart, deps: DiscoverServerPluginStartDeps) {
    return { locator: initializeLocatorServices(core, deps) };
  }

  public stop() {}
}
