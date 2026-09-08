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
import { useMemo } from 'react';
import { useGetGenerateDiscoverLink } from '../use_generate_discover_link';
import {
  applyUnmappedFieldsPolicy,
  type UnmappedFieldsPolicy,
} from '../../utils/esql_unmapped_fields';

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

  const esqlQueryString = useMemo(() => {
    if (!indexPattern || !whereClause) return undefined;

    const query = esql.from(indexPattern);
    if (unmappedFieldsPolicy) {
      applyUnmappedFieldsPolicy(query, unmappedFieldsPolicy);
    }
    query.where`${whereClause}`;
    return query.print('pipe-multiline');
  }, [indexPattern, unmappedFieldsPolicy, whereClause]);

  // `generateDiscoverLink` is recreated every render (it closes over the live
  // time range from the service), so calling it directly is intentional.
  const discoverUrl = indexPattern && whereClause ? generateDiscoverLink(whereClause) : undefined;

  return { discoverUrl, esqlQueryString };
}
