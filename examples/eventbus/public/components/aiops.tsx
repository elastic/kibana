/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC } from 'react';

import { EuiBadge } from '@elastic/eui';

import { criticalTableLookup } from '@kbn/ml-chi2test';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';
import { useFetchESQL } from '../hooks/use_fetch_esql';

interface AiopsProps {
  field: string;
}

export const Aiops: FC<AiopsProps> = ({ field }) => {
  const iframeID = `aiops_${field}`;

  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);
  const filters = state.useState((s) => s.filters);
  console.log('filters', filters);

  const esqlWithFilters = useMemo(() => {
    if (esql === '' || Object.values(filters).length === 0) return null;

    // FROM kibana_sample_data_logs
    // | STATS baseline = COUNT(*) WHERE response.keyword != "404",
    //         deviation = COUNT(*) WHERE response.keyword == "404" BY machine.os.keyword
    // | SORT deviation DESC

    const els = esql.split('|').map((d) => d.trim());
    const filter = Object.entries(filters)
      .filter(([key, value]) => {
        return key !== iframeID;
      })
      .map((d) => d[1])
      .join(' AND ');

    els.push(
      `STATS baseline = COUNT(*) WHERE NOT ${filter}, deviation = COUNT(*) WHERE (${filter}) BY ${field}`
    );
    els.push('SORT deviation DESC');

    return els.join('\n| ');
  }, [iframeID, field, filters, esql]);
  // console.log('esqlWithFilters', esqlWithFilters);

  const data = useFetchESQL(esqlWithFilters);
  if (field === 'response.keyword') {
    console.log('data', JSON.stringify(data?.values, null, 2));
  }

  const significantData = useMemo(() => {
    if (!data) return null;

    const observedTotal = data.values.reduce((acc, d) => acc + (d[1] as number), 0);
    const expectedTotal = data.values.reduce((acc, d) => acc + (d[0] as number), 0);

    // columns: baseline, deviation, entity
    // console.log('data', data);
    const augmented = data.values.map((d) => {
      if (field === 'response.keyword') {
        console.log('observation', {
          field,
          value: d[2],
          observed: d[1],
          expected: d[0],
          observedTotal,
          expectedTotal,
        });
      }

      const baseline = d[0] as number;
      const deviation = d[1] as number;

      const { chiSquared, pValue, isSignificant } = chiSquaredTest(
        d[1] as number,
        observedTotal,
        d[0] as number,
        expectedTotal,
        Math.min(30, data.values.length - 1)
      );

      const observedPercent = (deviation as number) / (observedTotal > 0 ? observedTotal : 1e-6);
      const expectedPercent = (baseline as number) / (expectedTotal > 0 ? expectedTotal : 1e-6);

      return {
        observed: observedPercent,
        expected: expectedPercent,
        chiSquared,
        pValue,
        isSignificant: isSignificant && observedPercent > expectedPercent,
        field,
        value: d[2],
      };
    });

    if (field === 'response.keyword') {
      console.log('augmented', augmented);
    }

    return augmented.filter((d) => d.isSignificant);
  }, [data, field]);

  const toggleItem = (filter: string) => {
    console.log('toggleItem', filter);
    state.actions.setCrossfilter({ id: iframeID, filter });
  };

  if (significantData) {
    return (
      <>
        {significantData.map((d) => {
          const isSelected = Object.values(filters).includes(`${field}=="${d.value}"`);
          return (
            <div css={{ padding: '2px', display: 'inline-block' }}>
              <EuiBadge
                key={d.value}
                color={isSelected ? 'primary' : 'lightgray'}
                onClick={() => toggleItem(`${field}=="${d.value}"`)}
              >
                {d.field}:{d.value}
              </EuiBadge>
            </div>
          );
        })}
      </>
    );
  }

  return null;
};

// Function to calculate p-value and significance
function chiSquaredTest(
  observed: number,
  observedTotal: number,
  expected: number,
  expectedTotal: number,
  df: number = 1
) {
  // Step 1: Calculate expected count for the observed total
  // const observedProportion = observed / observedTotal;
  const expectedProportion = expected / expectedTotal;
  const expectedCount = expectedProportion * observedTotal;

  // Step 2: Calculate chi-squared statistic
  const chiSquared = Math.pow(observed - expectedCount, 2) / expectedCount;

  // Step 3: Calculate p-value using a chi-squared CDF
  // const pValue = 1 - chiSquaredCDF(chiSquared, 1); // 1 degree of freedom
  const pValue = chiSquaredCDF(chiSquared, df);

  // Step 4: Determine significance (commonly p < 0.05 is significant)
  const isSignificant = pValue < 0.05;

  return { chiSquared, pValue, isSignificant };
}

// Chi-squared CDF approximation function
function chiSquaredCDF(x: number, df: number) {
  if (x < 0) return 0;
  const m = x / 2.0;
  let sum = Math.exp(-m);
  let term = sum;
  for (let i = 1; i <= df / 2; i++) {
    term *= m / i;
    sum += term;
  }
  return Math.min(sum, 1);
}
