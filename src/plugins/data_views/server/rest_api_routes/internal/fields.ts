/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { IRouter, RequestHandler, StartServicesAccessor } from '@kbn/core/server';
import { unwrapEtag } from '../../../common/utils';
import { IndexPatternsFetcher } from '../../fetcher';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import type { FieldDescriptorRestResponse } from '../route_types';
import { FIELDS_PATH as path } from '../../../common/constants';
import { parseFields, IBody, IQuery, querySchema, validate } from './fields_for';
import { DEFAULT_FIELD_CACHE_FRESHNESS } from '../../constants';

export function calculateHash(srcBuffer: Buffer) {
  const hash = createHash('sha1');
  hash.update(srcBuffer);
  return hash.digest('hex');
}

const handler: (isRollupsEnabled: () => boolean) => RequestHandler<{}, IQuery, IBody> =
  (isRollupsEnabled) => async (context, request, response) => {
    const core = await context.core;
    const uiSettings = core.uiSettings.client;
    const { asCurrentUser } = core.elasticsearch.client;
    const indexPatterns = new IndexPatternsFetcher(asCurrentUser, {
      uiSettingsClient: uiSettings,
      rollupsEnabled: isRollupsEnabled(),
    });

    const {
      pattern,
      meta_fields: metaFields,
      type,
      rollup_index: rollupIndex,
      allow_no_index: allowNoIndex,
      include_unmapped: includeUnmapped,
      field_types: fieldTypes,
    } = request.query;

    let parsedFields: string[] = [];
    let parsedMetaFields: string[] = [];
    let parsedFieldTypes: string[] = [];
    try {
      parsedMetaFields = parseFields(metaFields, 'meta_fields');
      parsedFields = parseFields(request.query.fields ?? [], 'fields');
      parsedFieldTypes = parseFields(fieldTypes || [], 'field_types');
    } catch (error) {
      return response.badRequest();
    }

    try {
      const { fields, indices } = await indexPatterns.getFieldsForWildcard({
        pattern,
        metaFields: parsedMetaFields,
        type,
        rollupIndex,
        fieldCapsOptions: {
          allow_no_indices: allowNoIndex || false,
          includeUnmapped,
        },
        fieldTypes: parsedFieldTypes,
        ...(parsedFields.length > 0 ? { fields: parsedFields } : {}),
      });

      const body: { fields: FieldDescriptorRestResponse[]; indices: string[] } = {
        fields,
        indices,
      };

      const bodyAsString = JSON.stringify(body);

      const etag = calculateHash(Buffer.from(bodyAsString));

      const headers: Record<string, string> = {
        'content-type': 'application/json',
        etag,
        vary: 'accept-encoding, user-hash',
      };

      // field cache is configurable in classic environment but not on serverless
      let cacheMaxAge = DEFAULT_FIELD_CACHE_FRESHNESS;
      const cacheMaxAgeSetting = await uiSettings.get<number | undefined>(
        'data_views:cache_max_age'
      );
      if (cacheMaxAgeSetting !== undefined) {
        cacheMaxAge = cacheMaxAgeSetting;
      }

      if (cacheMaxAge && fields.length) {
        const stale = 365 * 24 * 60 * 60 - cacheMaxAge;
        headers[
          'cache-control'
        ] = `private, max-age=${cacheMaxAge}, stale-while-revalidate=${stale}`;
      } else {
        headers['cache-control'] = 'private, no-cache';
      }

      const ifNoneMatch = request.headers['if-none-match'];
      const ifNoneMatchString = Array.isArray(ifNoneMatch) ? ifNoneMatch[0] : ifNoneMatch;

      if (ifNoneMatchString) {
        const requestHash = unwrapEtag(ifNoneMatchString);
        if (etag === requestHash) {
          return response.notModified({ headers });
        }
      }

      return response.ok({
        body: bodyAsString,
        headers,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        !!error?.isBoom &&
        !!error?.output?.payload &&
        typeof error?.output?.payload === 'object'
      ) {
        const payload = error?.output?.payload;
        return response.notFound({
          body: {
            message: payload.message,
            attributes: payload,
          },
        });
      } else {
        return response.notFound();
      }
    }
  };

export const registerFields = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  isRollupsEnabled: () => boolean
) => {
  router.versioned
    .get({ path, access: 'internal', enableQueryVersion: true })
    .addVersion(
      { version: '1', validate: { request: { query: querySchema }, response: validate.response } },
      handler(isRollupsEnabled)
    );
};
