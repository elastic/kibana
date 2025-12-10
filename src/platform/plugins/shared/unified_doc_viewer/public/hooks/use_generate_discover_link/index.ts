/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { from, where } from '@kbn/esql-composer';
import { castArray } from 'lodash';
import { getUnifiedDocViewerServices } from '../../plugin';

type WhereClause = ReturnType<typeof where>;

export interface GenerateDiscoverLink {
  (whereClause?: Record<string, any>): string | undefined;
  (...clauses: WhereClause[]): string | undefined;
}

export function useGetGenerateDiscoverLink({
  indexPattern,
}: {
  indexPattern?: string | (string | undefined)[];
}) {
  const {
    data,
    share: {
      url: { locators },
    },
  } = getUnifiedDocViewerServices();
  const timeRange = data.query.timefilter.timefilter.getAbsoluteTime();
  const discoverLocator = locators.get('DISCOVER_APP_LOCATOR');
  const indices = castArray(indexPattern).filter(Boolean);

  const generateDiscoverLink: GenerateDiscoverLink = (
    first?: Record<string, any> | WhereClause,
    ...rest: WhereClause[]
  ) => {
    if (!discoverLocator || !indices.length) {
      return undefined;
    }

    let esql: string;
    const _from = from(indices.join());

    if (typeof first === 'function') {
      esql = _from.pipe(first as WhereClause, ...rest).toString();
    } else if (first && typeof first === 'object') {
      const whereClause = first as Record<string, any>;
      const paramKeysMap = new Map<string, string>();
      const params: Array<Record<string, any>> = [];

      Object.keys(whereClause)
        .filter((key) => whereClause[key] !== undefined)
        .forEach((key) => {
          const paramKey = toESQLParamName(key);
          paramKeysMap.set(key, paramKey);
          params.push({ [paramKey]: whereClause[key] });
        });

      esql = _from
        .pipe(
          where(
            Array.from(paramKeysMap.keys())
              .map((key) => `${key} == ?${paramKeysMap.get(key)}`)
              .join(' AND '),
            params
          )
        )
        .toString();
    } else {
      esql = _from.toString();
    }

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

export const toESQLParamName = (str: string): string => str.replaceAll('.', '_');
