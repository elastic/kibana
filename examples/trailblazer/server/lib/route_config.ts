/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteSecurity } from '@kbn/core/server';
import type { ExpandWildcards } from '@elastic/elasticsearch/lib/api/types';
import { QUERY_LANGUAGES } from '../../common';

export const includeHiddenSchema = schema.boolean({ defaultValue: false });

export function expandWildcards(includeHidden: boolean): ExpandWildcards {
  return includeHidden ? ['open', 'hidden'] : 'open';
}

export const routeSecurity: RouteSecurity = {
  authz: {
    enabled: false,
    reason:
      'This route delegates authorization to Elasticsearch by using the current user scoped client',
  },
};

export const queryLanguageSchema = schema.oneOf([
  schema.literal(QUERY_LANGUAGES[0]),
  schema.literal(QUERY_LANGUAGES[1]),
  schema.literal(QUERY_LANGUAGES[2]),
]);
