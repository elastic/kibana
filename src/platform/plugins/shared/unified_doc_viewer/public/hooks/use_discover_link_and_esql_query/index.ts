/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from, type QueryOperator } from '@kbn/esql-composer';
import { useGetGenerateDiscoverLink } from '../use_generate_discover_link';
import { withUnmappedFields, type UnmappedFieldsPolicy } from './esql_unmapped_fields';

export { withUnmappedFields, type UnmappedFieldsPolicy } from './esql_unmapped_fields';

export interface UseDiscoverLinkAndEsqlQueryParams {
  indexPattern?: string;
  whereClause?: QueryOperator;
  unmappedFieldsPolicy?: UnmappedFieldsPolicy;
}

export function useDiscoverLinkAndEsqlQuery({
  indexPattern,
  whereClause,
  unmappedFieldsPolicy,
}: UseDiscoverLinkAndEsqlQueryParams) {
  const { generateDiscoverLink } = useGetGenerateDiscoverLink({
    indexPattern,
    unmappedFieldsPolicy,
  });

  if (!indexPattern || !whereClause) {
    return { discoverUrl: undefined, esqlQueryString: undefined };
  }

  const rawQuery = from(indexPattern).pipe(whereClause).toString();
  const esqlQueryString = unmappedFieldsPolicy
    ? withUnmappedFields(rawQuery, { policy: unmappedFieldsPolicy })
    : rawQuery;
  const discoverUrl = generateDiscoverLink(whereClause);

  return { discoverUrl, esqlQueryString };
}
