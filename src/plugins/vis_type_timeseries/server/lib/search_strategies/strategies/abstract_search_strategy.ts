/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { indexPatterns, IndexPatternsFetcher } from 'src/plugins/data/server';

import type { FieldSpec } from 'src/plugins/data/common';
import type { Framework } from '../../../plugin';
import type { SanitizedFieldType } from '../../../../common/types';
import type {
  VisTypeTimeseriesRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { getIndexPatternObject } from '../lib/get_index_pattern';

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
  constructor(private framework: Framework) {}
  async search(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesVisDataRequest,
    bodies: any[],
    indexType?: string
  ) {
    const requests: any[] = [];

    bodies.forEach((body) => {
      requests.push(
        requestContext.search
          .search(
            {
              indexType,
              params: {
                ...body,
              },
            },
            req.body.searchSession
          )
          .toPromise()
      );
    });
    return Promise.all(requests);
  }

  checkForViability(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest,
    indexPattern: string
  ): Promise<{ isViable: boolean; capabilities: any }> {
    throw new TypeError('Must override method');
  }

  async getFieldsForWildcard(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest,
    indexPattern: string,
    capabilities?: unknown,
    options?: Partial<{
      type: string;
      rollupIndex: string;
    }>
  ) {
    const indexPatternsFetcher = new IndexPatternsFetcher(
      requestContext.core.elasticsearch.client.asCurrentUser
    );
    const indexPatternsService = await this.framework.getIndexPatternsService(requestContext);
    const { indexPatternObject } = await getIndexPatternObject(indexPattern, {
      indexPatternsService,
    });

    return toSanitizedFieldType(
      indexPatternObject
        ? indexPatternObject.getNonScriptedFields()
        : await indexPatternsFetcher!.getFieldsForWildcard({
            pattern: indexPattern,
            fieldCapsOptions: { allow_no_indices: true },
            metaFields: [],
            ...options,
          })
    );
  }
}
