/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { respondWithSwrCache } from '@kbn/http-swr-cache';
import { IndexPatternsFetcher } from '../../fetcher';
import type { FieldDescriptorRestResponse } from '../route_types';
import { FIELDS_PATH as path } from '../../../common/constants';
import type { IBody, IQuery } from './fields_for';
import { parseFields, querySchema, validate } from './fields_for';

export const createHandler: (
  isRollupsEnabled: () => boolean
) => RequestHandler<{}, IQuery, IBody> =
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
      allow_hidden: allowHidden,
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
        allowHidden,
        fieldTypes: parsedFieldTypes,
        ...(parsedFields.length > 0 ? { fields: parsedFields } : {}),
      });

      const body: { fields: FieldDescriptorRestResponse[]; indices: string[] } = {
        fields,
        indices,
      };

      return respondWithSwrCache({
        context,
        request,
        response,
        body,
        cacheable: fields.length > 0,
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

export const registerFields = (router: IRouter, isRollupsEnabled: () => boolean) => {
  router.versioned
    .get({
      path,
      access: 'internal',
      enableQueryVersion: true,
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization provided by Elasticsearch',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { query: querySchema }, response: validate.response },
      },
      createHandler(isRollupsEnabled)
    );
};
