/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FakeRequest, IUiSettingsClient, SavedObjectsClientContract } from 'kibana/server';

import { indexPatterns, IndexPatternsFetcher } from '../../../../../data/server';

import type { Framework } from '../../../plugin';
import type { FieldSpec, IndexPatternsService } from '../../../../../data/common';
import type { VisPayload, SanitizedFieldType } from '../../../../common/types';
import type { VisTypeTimeseriesRequestHandlerContext } from '../../../types';

/**
 * ReqFacade is a regular KibanaRequest object extended with additional service
 * references to ensure backwards compatibility for existing integrations.
 *
 * This will be replaced by standard KibanaRequest and RequestContext objects in a later version.
 */
export interface ReqFacade<T = unknown> extends FakeRequest {
  requestContext: VisTypeTimeseriesRequestHandlerContext;
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

export const toSanitizedFieldType = (fields: FieldSpec[]) => {
  return fields
    .filter(
      (field) =>
        // Make sure to only include mapped fields, e.g. no index pattern runtime fields
        !field.runtimeField && field.aggregatable && !indexPatterns.isNestedField(field)
    )
    .map(
      (field) =>
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

    bodies.forEach((body) => {
      requests.push(
        req.requestContext.search
          .search(
            {
              indexType,
              params: {
                ...body,
              },
            },
            req.payload.searchSession
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
        ? kibanaIndexPattern.getNonScriptedFields()
        : await indexPatternsFetcher!.getFieldsForWildcard({
            pattern: indexPattern,
            fieldCapsOptions: { allow_no_indices: true },
            metaFields: [],
            ...options,
          })
    );
  }
}
