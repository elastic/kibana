/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IRouter } from '@kbn/core-http-server';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from '@kbn/core-lifecycle-server';
import { InferSearchResponseOf } from '@kbn/es-types';
import { AggregationsTopHitsAggregation } from '@elastic/elasticsearch/lib/api/types';

const ELASTIC_MANAGED = 'https://takingcare.in';
const CUSTOMER_MANAGED = 'http://takingcare.in:8001';

export const initGetPanelExplanation = <T extends RequestHandlerContext>({
  router,
  core,
}: {
  router: IRouter<T>;
  core: CoreSetup;
}) => {
  router.get<{ title: string }, unknown, unknown>(
    {
      path: `/api/embeddable/panel_explanation/{title}`,
      validate: {
        params: schema.object({
          title: schema.string(),
        }),
      },
    },
    async (_context, req, res) => {
      try {
        const { title } = req.params;
        const [{ elasticsearch }] = await core.getStartServices();
        const esClient = elasticsearch.client.asScoped(req).asCurrentUser;

        const params = {
          size: 0,
          query: {
            term: {
              panel_name: {
                value: title.replace(/\_\_/g, '/'),
              },
            },
          },
          aggs: {
            description: {
              top_hits: {
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                ],
                _source: {
                  includes: ['panel_description'],
                },
                size: 1,
              } as AggregationsTopHitsAggregation,
            },
          },
        };

        const result = (await esClient.search({
          index: 'panel_details',
          body: { ...params },
        })) as InferSearchResponseOf<{}, typeof params>;

        if ((result.aggregations?.description.hits.hits ?? []).length > 0) {
          const { panel_description: panelDescription } =
            (result.aggregations?.description.hits.hits[0]._source as {
              panel_description: string;
            }) ?? {};

          return res.ok({
            body: { data: { explanation: panelDescription } },
          });
        }

        const requests = [
          fetch(`${ELASTIC_MANAGED}/panel/${title}`).then(handleResponse),
          fetch(`${CUSTOMER_MANAGED}/panel/${title}`).then(handleResponse),
        ];

        const externalExplanation = await Promise.all(requests).then(
          ([elasticManagedResponse, customManagedResponse]) => {
            return elasticManagedResponse || customManagedResponse;
          }
        );

        return res.ok({
          body: { data: { explanation: externalExplanation } },
        });
      } catch (error) {
        return res.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};

const handleResponse = (response: Response) => {
  if (response.status !== 200) {
    return '';
  }

  return response.text();
};
