/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DateHistogramIndexPatternColumn } from '@kbn/lens-plugin/public';

export type DateHistogramColumnParams = DateHistogramIndexPatternColumn['params'];
export const getHistogramColumn = ({
  options,
}: {
  options?: Partial<
    Pick<DateHistogramIndexPatternColumn, 'sourceField'> & {
      params: DateHistogramColumnParams;
    }
  >;
}): DateHistogramIndexPatternColumn => {
  const { interval = 'auto', ...rest } = options?.params ?? {};

  return {
    dataType: 'date',
    isBucketed: true,
    label: '@timestamp',
    operationType: 'date_histogram',
    scale: 'interval',
    sourceField: options?.sourceField ?? '@timestamp',
    params: { interval, ...rest },
  };
};
