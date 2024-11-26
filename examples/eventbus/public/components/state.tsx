/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, type FC } from 'react';

import { useDeps } from '../hooks/use_deps';
import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

export const State: FC = () => {
  const { plugins } = useDeps();
  const { data: dataPlugin } = plugins;
  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);

  // fetch data from ES
  useEffect(() => {
    const fetchData = async () => {
      try {
        const index = esql.split('|')[0].trim().split(' ')[1];
        const resp = await dataPlugin.dataViews.find(index);
        const dataView = resp[0];
        const fields = dataView.fields.filter((d) => !d.spec.runtimeField).map((d) => d.spec.name);

        state.actions.setAllFields(fields);

        if (fields.includes('@timestamp')) {
          state.actions.setSelectedFields(['@timestamp']);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch index fields', e);
      }
    };

    if (esql !== '') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esql]);

  return null;
};
