/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC } from 'react';

import type { ESQLSearchResponse } from '@kbn/es-types';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';
import { useFetchESQL } from '../hooks/use_fetch_esql';

interface AiopsProps {
  field: string;
}

export const Aiops: FC<AiopsProps> = ({ field }) => {
  const iframeID = `aiops`;

  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);
  const filters = state.useState((s) => s.filters);

  const esqlWithFilters = useMemo(() => {
    if (esql === '' || Object.values(filters).length === 0) return null;

    // FROM kibana_sample_data_logs
    // | STATS baseline = COUNT(*) WHERE response.keyword != "404",
    //         deviation = COUNT(*) WHERE response.keyword == "404" BY machine.os.keyword
    // | SORT deviation DESC

    const els = esql.split('|').map((d) => d.trim());
    const filter = Object.values(filters).join(' AND ');

    els.push(
      `STATS baseline = COUNT(*) WHERE NOT ${filter}, deviation = COUNT(*) WHERE (${filter}) BY ${field}`
    );
    els.push('SORT deviation DESC');

    return els.join('\n| ');
  }, [field, filters, esql]);
  console.log('esqlWithFilters', esqlWithFilters);

  const data = useFetchESQL(esqlWithFilters);
  console.log('data', data);

  return null;
};
