/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import { IEsSearchRequest } from '../../../data/server';
import { IEsSearchResponse } from '../../../data/common';
import type { DataRequestHandlerContext } from '../../../data/server';
import type { IRouter } from '../../../../core/server';
import { TOPN_CONTAINERS_ROUTE_PATH } from '../../common';
import { getDocID } from './index';

export function registerTraceEventsTopNContainersSearchRoute(
  router: IRouter<DataRequestHandlerContext>
) {
  router.get(
    {
      path: TOPN_CONTAINERS_ROUTE_PATH,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const { index, projectID, timeFrom, timeTo } = request.query;

      try {
        const resTopNStackTraces = await context
          .search!.search(
            {
              params: {
                index,
                body: {
                  query: {
                    bool: {
                      must: [
                        {
                          term: {
                            ProjectID: {
                              value: projectID,
                              boost: 1.0,
                            },
                          },
                        },
                        {
                          range: {
                            TimeStamp: {
                              gte: timeFrom,
                              lt: timeTo,
                              format: 'epoch_second',
                              boost: 1.0,
                            },
                          },
                        },
                      ],
                    },
                  },
                  aggs: {
                    histogram: {
                      auto_date_histogram: {
                        field: 'TimeStamp',
                        buckets: 100,
                      },
                      aggs: {
                        group_by: {
                          terms: {
                            field: 'ContainerName',
                            size: 100,
                          },
                        },
                      },
                    },
                  },
                },
              },
            } as IEsSearchRequest,
            {}
          )
          .toPromise();

        return response.ok({
          body: {
            topN: (resTopNStackTraces as IEsSearchResponse).rawResponse.aggregations,
          },
        });
      } catch (e) {
        return response.customError({
          statusCode: e.statusCode ?? 500,
          body: {
            message: e.message,
          },
        });
      }
    }
  );
}
