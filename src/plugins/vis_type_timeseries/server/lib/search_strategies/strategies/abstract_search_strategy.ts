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

import type {
  RequestHandlerContext,
  FakeRequest,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from 'kibana/server';

import type { Framework } from '../../../plugin';
import type { IndexPatternsFetcher, IFieldType } from '../../../../../data/server';
import type { VisPayload } from '../../../../common/types';
import type { IndexPatternsService } from '../../../../../data/common';
import { indexPatterns } from '../../../../../data/server';
import { SanitizedFieldType } from '../../../../common/types';

/**
 * ReqFacade is a regular KibanaRequest object extended with additional service
 * references to ensure backwards compatibility for existing integrations.
 *
 * This will be replaced by standard KibanaRequest and RequestContext objects in a later version.
 */
export interface ReqFacade<T = unknown> extends FakeRequest {
  requestContext: RequestHandlerContext;
  framework: Framework;
  payload: T;
  pre: {
    indexPatternsFetcher?: IndexPatternsFetcher;
  };
  getUiSettingsService: () => IUiSettingsClient;
  getSavedObjectsClient: () => SavedObjectsClientContract;
  getEsShardTimeout: () => Promise<number>;
  getIndexPatternsService: () => Promise<IndexPatternsService>;
}

const toSanitizedFieldType = (fields: IFieldType[]) => {
  return fields
    .filter((field) => field.aggregatable && !indexPatterns.isNestedField(field))
    .map(
      (field: IFieldType) =>
        ({
          name: field.name,
          label: field.customLabel ?? field.name,
          type: field.type,
        } as SanitizedFieldType)
    );
};

export abstract class AbstractSearchStrategy {
  async search(req: ReqFacade<VisPayload>, bodies: any[], indexType?: string) {
    const requests: any[] = [];
    const { sessionId } = req.payload;

    bodies.forEach((body) => {
      requests.push(
        req.requestContext
          .search!.search(
            {
              indexType,
              params: {
                ...body,
              },
            },
            {
              sessionId,
            }
          )
          .toPromise()
      );
    });
    return Promise.all(requests);
  }

  checkForViability(
    req: ReqFacade<VisPayload>,
    indexPattern: string
  ): Promise<{ isViable: boolean; capabilities: unknown }> {
    throw new TypeError('Must override method');
  }

  async getFieldsForWildcard<TPayload = unknown>(
    req: ReqFacade<TPayload>,
    indexPattern: string,
    capabilities?: unknown,
    options?: Partial<{
      type: string;
      rollupIndex: string;
    }>
  ) {
    const { indexPatternsFetcher } = req.pre;
    const indexPatternsService = await req.getIndexPatternsService();
    const kibanaIndexPattern = (await indexPatternsService.find(indexPattern)).find(
      (index) => index.title === indexPattern
    );

    return toSanitizedFieldType(
      kibanaIndexPattern
        ? kibanaIndexPattern.fields.getAll()
        : await indexPatternsFetcher!.getFieldsForWildcard({
            pattern: indexPattern,
            fieldCapsOptions: { allow_no_indices: true },
            metaFields: [],
            ...options,
          })
    );
  }
}
