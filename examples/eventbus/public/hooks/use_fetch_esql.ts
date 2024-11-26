/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';

import { getESQLResults } from '@kbn/esql-utils';
import type { ESQLSearchResponse } from '@kbn/es-types';

import { useDeps } from './use_deps';

export const useFetchESQL = (esqlWithFilters: string | null) => {
  const { plugins } = useDeps();
  const { data: dataPlugin } = plugins;

  const [data, setData] = useState<ESQLSearchResponse>();

  // fetch data from ES
  useEffect(() => {
    const fetchData = async () => {
      if (esqlWithFilters === null) return;

      const resultCrossfilter = await getESQLResults({
        esqlQuery: esqlWithFilters,
        // filter,
        search: dataPlugin.search.search,
        // signal: abortController?.signal,
        // timeRange: { from: fromDate, to: toDate },
      });

      setData(resultCrossfilter.response);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esqlWithFilters]);

  return data;
};
