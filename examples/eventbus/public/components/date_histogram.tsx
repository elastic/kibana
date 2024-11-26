/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC } from 'react';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';
import { useFetchESQL } from '../hooks/use_fetch_esql';

interface DateHistogramProps {
  field: string;
}

export const DateHistogram: FC<DateHistogramProps> = ({ field }) => {
  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);

  const esqlWithFilters = useMemo(() => {
    if (esql === '') return null;
    return `${esql} | STATS count = COUNT(*) BY date = BUCKET(${field}, 1, "2024-07-01T00:00:00.000Z", "2024-07-01T23:59:00.000Z")`;
  }, [esql, field]);

  const data = useFetchESQL(esqlWithFilters);
  console.log('date histogram', data);

  return <div>DATE HISTOGRAM: {field}</div>;
};
