/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { useGetGenerateDiscoverLink } from '../use_generate_discover_link';
import { withUnmappedFields, type UnmappedFieldsPolicy } from '../../utils/esql_unmapped_fields';

export interface UseDiscoverLinkAndEsqlQueryParams {
  indexPattern?: string;
  whereClause?: ESQLAstExpression;
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

  // Build a fresh query per call because `ComposerQuery.where` mutates in place.
  const query = esql.from(indexPattern);
  if (unmappedFieldsPolicy) {
    withUnmappedFields(query, { policy: unmappedFieldsPolicy });
  }
  query.where`${whereClause}`;
  const esqlQueryString = query.print('pipe-multiline');
  const discoverUrl = generateDiscoverLink(whereClause);

  return { discoverUrl, esqlQueryString };
}
