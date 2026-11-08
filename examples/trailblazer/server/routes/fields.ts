/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { FieldSummary, FieldsResponse } from '../../common';
import { DATE_FIELD_TYPES, FIELDS_ROUTE, MAX_NAME_LENGTH } from '../../common';
import { toErrorResponse } from '../lib/error_response';
import { expandWildcards, includeHiddenSchema, routeSecurity } from '../lib/route_config';

const IGNORED_TYPES: readonly string[] = ['object', 'nested', 'unmapped'];

export function registerFieldsRoute(router: IRouter) {
  router.get(
    {
      path: FIELDS_ROUTE,
      security: routeSecurity,
      validate: {
        query: schema.object({
          index: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
          includeHidden: includeHiddenSchema,
        }),
      },
    },
    async (context, request, response) => {
      const { index, includeHidden } = request.query;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      try {
        const caps = await esClient.fieldCaps({
          index,
          fields: '*',
          ignore_unavailable: true,
          expand_wildcards: expandWildcards(includeHidden),
          allow_no_indices: true,
        });

        const fields = Object.entries(caps.fields)
          .map(([name, byType]) => toFieldSummary(name, byType))
          .filter((field): field is FieldSummary => field !== undefined)
          .sort((a, b) => a.name.localeCompare(b.name));

        const body: FieldsResponse = { fields, timeField: findTimeField(fields) };
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
}

function toFieldSummary(
  name: string,
  byType: Record<string, FieldCapsFieldCapability>
): FieldSummary | undefined {
  const capabilities = Object.values(byType).filter(
    (capability) => !capability.metadata_field && !IGNORED_TYPES.includes(capability.type)
  );
  if (capabilities.length === 0 || name.startsWith('_')) return undefined;

  const [first] = capabilities;
  const types = capabilities.map(({ type }) => type);
  return {
    name,
    type: first.type,
    aggregatable: capabilities.every(({ aggregatable }) => aggregatable),
    searchable: capabilities.every(({ searchable }) => searchable),
    ...(types.length > 1 ? { conflictingTypes: types } : {}),
  };
}

function findTimeField(fields: readonly FieldSummary[]): string | undefined {
  const dateFields = fields.filter(({ type }) => DATE_FIELD_TYPES.includes(type));
  return dateFields.find(({ name }) => name === '@timestamp')?.name ?? dateFields[0]?.name;
}
