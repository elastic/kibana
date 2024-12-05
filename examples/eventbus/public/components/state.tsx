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
  const { core, plugins } = useDeps();
  const { data: dataPlugin } = plugins;
  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);

  useEffect(() => {
    const fetchData = async () => {
      // get fields for UI from data view
      try {
        const index = esql.split('|')[0].trim().split(' ')[1];
        const resp = await dataPlugin.dataViews.find(index);
        const dataView = resp[0];
        // console.log('dataView.fields', dataView.fields);
        const fields = dataView.fields
          .filter((d) => !d.spec.runtimeField)
          .reduce<Record<string, string>>((acc, d) => {
            // console.log('field', d.spec);
            // reduce to Record<string, string>
            if (Array.isArray(d.spec.esTypes)) {
              acc[d.spec.name] = d.spec.esTypes[0];
            }
            return acc;
          }, {});

        state.actions.setAllFields(fields);

        // refactor from includes to work with record
        if (fields['@timestamp'] && fields.message) {
          state.actions.setSelectedFields(['@timestamp', 'message']);
        } else if (fields['@timestamp']) {
          state.actions.setSelectedFields(['@timestamp']);
        } else if (fields.message) {
          state.actions.setSelectedFields(['message']);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch index fields', e);
      }

      // get fields for AIOPS via endpoint
      try {
        const index = esql.split('|')[0].trim().split(' ')[1];
        const resp = await core.http.post('/internal/aiops/log_rate_analysis/field_candidates', {
          // signal: abortCtrl.current.signal,
          version: '1',
          // headers,
          body: JSON.stringify({
            start: 0,
            end: 2736459126749,
            searchQuery: '{"match_all":{}}',
            timeFieldName: '@timestamp',
            index,
            grouping: false,
            flushFix: true,
            baselineMin: 0,
            baselineMax: 1,
            deviationMin: 2,
            deviationMax: 2734825600000,
            sampleProbability: 1,
          }),
        });
        console.log('resp.keywordFieldCandidates', resp);
        state.actions.setAiopsFieldCandidates(resp.keywordFieldCandidates);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch AIOps field candidates', e);
      }
    };

    if (esql !== '') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esql]);

  return null;
};
