/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterValueFormatter, isPhrasesFilter } from '../../../../../common';

const getFormattedValueFn = (params: any) => {
  return (formatter?: FilterValueFormatter) => {
    return params
      .map((v: any) => {
        return formatter ? formatter.convert(v) : v;
      })
      .join(', ');
  };
};

export const mapPhrases = (filter: Filter) => {
  if (!isPhrasesFilter(filter)) {
    throw filter;
  }

  const { type, key, params } = filter.meta;

  return {
    type,
    key,
    value: getFormattedValueFn(params),
    params,
  };
};
