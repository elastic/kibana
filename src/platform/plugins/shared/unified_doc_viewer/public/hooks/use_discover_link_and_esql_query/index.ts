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

export interface UseDiscoverLinkAndEsqlQueryParams {
  indexPattern?: string;
  whereClause?: QueryOperator;
}

export function useDiscoverLinkAndEsqlQuery({
  indexPattern,
  whereClause,
}: UseDiscoverLinkAndEsqlQueryParams) {
  const { generateDiscoverLink } = useGetGenerateDiscoverLink({ indexPattern });

  if (!indexPattern || !whereClause) {
    return { discoverUrl: undefined, esqlQueryString: undefined };
  }

  const esqlQueryString = from(indexPattern).pipe(whereClause).toString();
  const discoverUrl = generateDiscoverLink(whereClause);

  return { discoverUrl, esqlQueryString };
}
