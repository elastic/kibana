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
import { castArray } from 'lodash';
import { getUnifiedDocViewerServices } from '../../plugin';
import {
  applyUnmappedFieldsPolicy,
  type UnmappedFieldsPolicy,
} from '../../utils/esql_unmapped_fields';

export type GenerateDiscoverLink = (whereClause?: ESQLAstExpression) => string | undefined;

export function useGetGenerateDiscoverLink({
  indexPattern,
  unmappedFieldsPolicy,
}: {
  indexPattern?: string | (string | undefined)[];
  unmappedFieldsPolicy?: UnmappedFieldsPolicy;
}) {
  const {
    data,
    share: {
      url: { locators },
    },
  } = getUnifiedDocViewerServices();
  const timeRange = data.query.timefilter.timefilter.getAbsoluteTime();
  const discoverLocator = locators.get('DISCOVER_APP_LOCATOR');
  const indices = castArray(indexPattern).filter((index): index is string => Boolean(index));

  const generateDiscoverLink: GenerateDiscoverLink = (whereClause?: ESQLAstExpression) => {
    if (!discoverLocator || !indices.length) {
      return undefined;
    }

    // Build a fresh query per call because `ComposerQuery.where` mutates in place.
    const query = esql.from(indices.join());
    if (unmappedFieldsPolicy) {
      applyUnmappedFieldsPolicy(query, unmappedFieldsPolicy);
    }
    if (whereClause) {
      query.where`${whereClause}`;
    }

    const url = discoverLocator.getRedirectUrl({
      timeRange,
      filters: [],
      query: { language: 'kuery', esql: query.print('pipe-multiline') },
    });

    return url;
  };

  return {
    generateDiscoverLink,
  };
}
