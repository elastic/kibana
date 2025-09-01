/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { chain } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import { schema, type TypeOf } from '@kbn/config-schema';
import {
  type ISavedObjectsClientFactory,
  Request,
  Response,
  SavedObjectsClientFactory,
  SavedObjectsTypeRegistry,
} from '@kbn/core-di-server';
import type {
  ISavedObjectTypeRegistry,
  KibanaRequest,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from '@kbn/core/server';

@injectable()
export class ScrollCountRoute {
  static method = 'post' as const;
  static handleLegacyErrors = true;
  static path = '/api/kibana/management/saved_objects/scroll/counts';
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization',
    },
  } as const;
  static validate = {
    body: schema.object({
      typesToInclude: schema.arrayOf(schema.string()),
      searchString: schema.maybe(schema.string()),
      references: schema.maybe(
        schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
          })
        )
      ),
    }),
  };

  private readonly client: SavedObjectsClientContract;

  constructor(
    @inject(SavedObjectsClientFactory) clientFactory: ISavedObjectsClientFactory,
    @inject(SavedObjectsTypeRegistry) typeRegistry: ISavedObjectTypeRegistry,
    @inject(Request)
    private readonly request: KibanaRequest<
      never,
      never,
      TypeOf<typeof ScrollCountRoute.validate.body>
    >,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {
    this.client = clientFactory({
      includedHiddenTypes: chain(request.body.typesToInclude)
        .uniq()
        .filter(
          (type) => typeRegistry.isHidden(type) && typeRegistry.isImportableAndExportable(type)
        )
        .value(),
    });
  }

  private async getSavedObjectCounts(): Promise<Record<string, number>> {
    const { typesToInclude, searchString, references } = this.request.body;
    const body = await this.client.find<void, { types: estypes.AggregationsStringTermsAggregate }>({
      ...(searchString ? { search: `${searchString}*`, searchFields: ['title'] } : {}),
      ...(references ? { hasReference: references, hasReferenceOperator: 'OR' } : {}),
      type: typesToInclude,
      perPage: 0,
      aggs: {
        types: {
          terms: {
            field: 'type',
            size: typesToInclude.length,
          },
        },
      },
    });

    const buckets =
      (body.aggregations?.types?.buckets as estypes.AggregationsStringTermsBucketKeys[]) || [];

    const counts = buckets.reduce((memo, bucket) => {
      memo[`${bucket.key}`] = bucket.doc_count;
      return memo;
    }, {} as Record<string, number>);

    return counts;
  }

  async handle() {
    const rawCounts = await this.getSavedObjectCounts();
    const counts: Record<string, number> = {};
    for (const type of this.request.body.typesToInclude) {
      counts[type] = rawCounts[type] ?? 0;
    }

    return this.response.ok({
      body: counts,
    });
  }
}
