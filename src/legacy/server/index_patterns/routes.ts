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

import { first } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import { InternalCoreSetup, KibanaRequest, RequestHandlerContext } from '../../../core/server';
import { IndexPatternsService } from './service';

export function registerRoutes(core: InternalCoreSetup) {
  const getIndexPatternsService = async (request: KibanaRequest): Promise<IndexPatternsService> => {
    const client = await core.elasticsearch.dataClient$.pipe(first()).toPromise();
    const callCluster = (endpoint: any, params: any, options?: any) =>
      client.asScoped(request).callAsCurrentUser(endpoint, params, options);
    return new Promise(resolve => resolve(new IndexPatternsService(callCluster)));
  };

  const router = core.http.createRouter('/api/index_patterns');
  router.get(
    {
      path: '/_fields_for_wildcard',
      validate: {
        query: schema.object({
          pattern: schema.string(),
          meta_fields: schema.string({ defaultValue: '[]' }),
        }),
      },
    },
    async (context: RequestHandlerContext, request: any, response: any) => {
      const indexPatterns = await getIndexPatternsService(request);
      const { pattern, meta_fields: metaFields } = request.query;

      let parsedFields = [];
      try {
        parsedFields = JSON.parse(metaFields);
      } catch (error) {
        return response.badRequest();
      }

      const fields = await indexPatterns.getFieldsForWildcard({
        pattern,
        metaFields: parsedFields,
      });

      return response.ok({
        body: { fields },
        headers: {
          'content-type': 'application/json',
        },
      });
    }
  );

  router.get(
    {
      path: '/_fields_for_time_pattern',
      validate: {
        query: schema.object({
          pattern: schema.string(),
          interval: schema.maybe(schema.string()),
          look_back: schema.number({ min: 1 }),
          meta_fields: schema.string({ defaultValue: '[]' }),
        }),
      },
    },
    async (context: RequestHandlerContext, request: any, response: any) => {
      const indexPatterns = await getIndexPatternsService(request);
      const { pattern, interval, look_back: lookBack, meta_fields: metaFields } = request.query;

      try {
        const fields = await indexPatterns.getFieldsForTimePattern({
          pattern,
          interval: interval ? interval : '',
          lookBack,
          metaFields: JSON.parse(metaFields),
        });

        return response.ok({
          body: { fields },
          headers: {
            'content-type': 'application/json',
          },
        });
      } catch (error) {
        return response.notFound();
      }
    }
  );
}
