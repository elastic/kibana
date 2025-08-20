/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from, where } from '@kbn/esql-composer';
import { getUnifiedDocViewerServices } from '../../../../plugin';

export type GenerateDiscoverLink = (whereClause?: Record<string, any>) => string | undefined;

export function useGetGenerateDiscoverLink({ indexPattern }: { indexPattern?: string }) {
  const {
    data,
    share: {
      url: { locators },
    },
  } = getUnifiedDocViewerServices();
  const timeRange = data.query.timefilter.timefilter.getAbsoluteTime();
  const discoverLocator = locators.get('DISCOVER_APP_LOCATOR');

  const generateDiscoverLink: GenerateDiscoverLink = (whereClause) => {
    if (!discoverLocator || !indexPattern) {
      return undefined;
    }

    const esql = from(indexPattern)
      .pipe(
        whereClause
          ? where(
              Object.keys(whereClause)
                .map((key) => `${key} == ?${key}`)
                .join(' AND '),
              whereClause
            )
          : (query) => query
      )
      .toString();

    const url = discoverLocator.getRedirectUrl({
      timeRange,
      filters: [],
      query: { language: 'kuery', esql },
    });

    return url;
  };

  return {
    generateDiscoverLink,
  };
}
