/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from '@kbn/core/server';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import seedrandom from 'seedrandom';
import type { SamplingOption } from '../../common/utils/random_sampler_utils';
import { BASE_API_PATH, FIELD_STATS_API_PATH } from '../../common/constants';
import type { PluginStart } from '../types';
import {
  fetchAndCalculateFieldStats,
  SearchHandler,
  buildSearchParams,
} from '../../common/utils/field_stats_utils';
import { buildAggregationWithSamplingOption } from '../../common/utils/random_sampler_utils';

// The desired minimum threshold of randomly sampled documents for which the result is more meaningful
const DESIRED_MINIMUM_RANDOM_SAMPLER_DOC_COUNT = 100000;

export async function initFieldStatsRoute(setup: CoreSetup<PluginStart>) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: FIELD_STATS_API_PATH,
      validate: {
        body: schema.object(
          {
            dslQuery: schema.object({}, { unknowns: 'allow' }),
            fromDate: schema.string(),
            toDate: schema.string(),
            dataViewId: schema.string(),
            fieldName: schema.string(),
            size: schema.maybe(schema.number()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, req, res) => {
      const requestClient = (await context.core).elasticsearch.client.asCurrentUser;
      const { fromDate, toDate, fieldName, dslQuery, size, dataViewId } = req.body;

      const [{ savedObjects, elasticsearch }, { dataViews }] = await setup.getStartServices();
      const savedObjectsClient = savedObjects.getScopedClient(req);
      const esClient = elasticsearch.client.asScoped(req).asCurrentUser;
      const indexPatternsService = await dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        esClient
      );
      const seed = Math.random().toString();

      try {
        const dataView = await indexPatternsService.get(dataViewId);
        const field = dataView.fields.find((f) => f.name === fieldName);

        if (!field) {
          throw new Error(`Field {fieldName} not found in data view ${dataView.title}`);
        }

        const searchHandler: SearchHandler = async (body) => {
          const result = await requestClient.search(
            buildSearchParams({
              dataViewPattern: dataView.title,
              timeFieldName: dataView.timeFieldName,
              fromDate,
              toDate,
              dslQuery,
              runtimeMappings: dataView.getRuntimeMappings(),
              ...body,
            })
          );
          return result;
        };

        const defaultSamplingOption: SamplingOption = {
          mode: 'normal_sampling',
          shardSize: 5000,
          seed,
        };

        const stats = await fetchAndCalculateFieldStats({
          searchHandler,
          dataView,
          field,
          fromDate,
          toDate,
          size,
          samplingOption: defaultSamplingOption,
        });

        return res.ok({
          body: stats,
        });
      } catch (e) {
        if (e instanceof SavedObjectNotFound) {
          return res.notFound();
        }
        if (e instanceof errors.ResponseError && e.statusCode === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          throw new Error(e.output.message);
        } else {
          throw e;
        }
      }
    }
  );

  router.post(
    {
      path: `${BASE_API_PATH}/benchmark/{samplingMode}`,
      validate: {
        params: schema.object({
          samplingMode: schema.oneOf([
            schema.literal('normal_sampling'),
            schema.literal('random_sampling'),
            schema.literal('no_sampling'),
            schema.literal('all'),
          ]),
        }),
        body: schema.object(
          {
            dslQuery: schema.object({}, { unknowns: 'allow' }),
            fromDate: schema.string(),
            toDate: schema.string(),
            dataViewId: schema.string(),
            // fieldName: schema.string(),
            size: schema.maybe(schema.number()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, req, res) => {
      const requestClient = (await context.core).elasticsearch.client.asCurrentUser;
      const { fromDate, toDate, dslQuery, size, dataViewId } = req.body;
      const { samplingMode } = req.params;

      const [{ savedObjects, elasticsearch }, { dataViews }] = await setup.getStartServices();
      const savedObjectsClient = savedObjects.getScopedClient(req);
      const esClient = elasticsearch.client.asScoped(req).asCurrentUser;
      const indexPatternsService = await dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        esClient
      );

      try {
        const dataView = await indexPatternsService.get(dataViewId);
        const fields = dataView.fields.filter((f) => f.aggregatable);
        const searchParams = {
          dataViewPattern: dataView.title,
          timeFieldName: dataView.timeFieldName,
          fromDate,
          toDate,
          dslQuery,
          runtimeMappings: dataView.getRuntimeMappings(),
        };

        const searchHandler: SearchHandler = async (body) => {
          const result = await requestClient.search(
            buildSearchParams({
              ...searchParams,
              ...body,
            })
          );
          return result;
        };
        const searchHandlerNoTrackHits: SearchHandler = async (body) => {
          const result = await requestClient.search(
            buildSearchParams({
              ...searchParams,
              ...body,
              size: 0,
              trackTotalHits: false,
            })
          );
          return result;
        };

        const noSamplingOption: SamplingOption = {
          mode: 'no_sampling',
          seed: Math.abs(seedrandom().int32()).toString(),
        };

        const randomSamplingOption: SamplingOption = {
          mode: 'random_sampling',
          probability: 1e-5,
          seed: Math.abs(seedrandom().int32()).toString(),
        };

        // if random sampler, first make initial api request
        // then override probability

        const normalSamplingOption: SamplingOption = {
          mode: 'normal_sampling',
          shardSize: 5000,
          seed: Math.abs(seedrandom().int32()).toString(),
        };

        const results = [];
        if (samplingMode === noSamplingOption.mode || samplingMode === 'all') {
          await requestClient.indices.clearCache();

          const noSamplingStatsStart = Date.now();
          const noSamplingStats = await Promise.all(
            fields.map((field) =>
              fetchAndCalculateFieldStats({
                searchHandler,
                dataView,
                field,
                fromDate,
                toDate,
                size,
                samplingOption: noSamplingOption,
              })
            )
          );
          const noSamplingStatsTook = Date.now() - noSamplingStatsStart;
          results.push({
            noSampling: {
              results: noSamplingStats,
              took: noSamplingStatsTook,
              seed: noSamplingOption.seed,
            },
          });
        }

        if (samplingMode === randomSamplingOption.mode || samplingMode === 'all') {
          await requestClient.indices.clearCache();

          const randomSamplingStatsStart = Date.now();

          const initialDefaultProbability = 1e-4;
          if (fields.length > 0 && typeof fields[0].name === 'string') {
            const firstResp = await requestClient.search(
              buildSearchParams({
                ...searchParams,
                size: 0,
                trackTotalHits: false,
                aggs: buildAggregationWithSamplingOption(
                  {
                    types_count: { value_count: { field: fields[0].name } },
                  },
                  randomSamplingOption
                ),
              })
            );

            // @ts-expect-error ES types needs to be updated with doc_count as part random sampler aggregation
            const numSampled = firstResp.aggregations?.sample?.doc_count;
            const numDocs = DESIRED_MINIMUM_RANDOM_SAMPLER_DOC_COUNT;
            if (firstResp !== undefined) {
              const newProbability =
                (initialDefaultProbability * numDocs) / (numSampled - 2 * Math.sqrt(numSampled));

              const randomSamplingOptionStats = await Promise.all(
                fields.map((field) =>
                  fetchAndCalculateFieldStats({
                    searchHandler: searchHandlerNoTrackHits,
                    dataView,
                    field,
                    fromDate,
                    toDate,
                    size,
                    samplingOption: { ...randomSamplingOption, probability: newProbability },
                  })
                )
              );
              const randomSamplingStatsTook = Date.now() - randomSamplingStatsStart;
              results.push({
                randomSampling: {
                  results: randomSamplingOptionStats,
                  took: randomSamplingStatsTook,
                  probability: newProbability,
                  seed: randomSamplingOption.seed,
                },
              });
            }
          }
        }

        if (samplingMode === normalSamplingOption.mode || samplingMode === 'all') {
          await requestClient.indices.clearCache();

          const normalSamplingStatsStart = Date.now();
          const normalSamplingStats = await Promise.all(
            fields.map((field) =>
              fetchAndCalculateFieldStats({
                searchHandler,
                dataView,
                field,
                fromDate,
                toDate,
                size,
                samplingOption: normalSamplingOption,
              })
            )
          );
          const normalSamplingStatsTook = Date.now() - normalSamplingStatsStart;
          results.push({
            normalSampling: {
              results: normalSamplingStats,
              took: normalSamplingStatsTook,
              seed: normalSamplingOption.seed,
            },
          });
        }

        return res.ok({
          body: results,
        });
      } catch (e) {
        if (e instanceof SavedObjectNotFound) {
          return res.notFound();
        }
        if (e instanceof errors.ResponseError && e.statusCode === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          throw new Error(e.output.message);
        } else {
          throw e;
        }
      }
    }
  );
}
