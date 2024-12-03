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

  const esqlWithFilters = useMemo(() => {
    if (esql === '' || Object.values(filters).length === 0) return null;

    const els = esql.split('|').map((d) => d.trim());
    const filter = Object.entries(filters)
      .filter(([key, value]) => {
        return !key.startsWith('aiops_');
      })
      .map((d) => d[1])
      .join(' AND ');

    els.push(
      `STATS baseline = COUNT(*) WHERE NOT ${filter}, deviation = COUNT(*) WHERE (${filter}) BY ${field}`
    );
    els.push('SORT deviation DESC');

    return els.join('\n| ');
  }, [field, filters, esql]);
  // console.log('esqlWithFilters', esqlWithFilters);

  const data = useFetchESQL(esqlWithFilters);

  const significantData = useMemo(() => {
    if (!data) return null;

    const observedTotal = data.values.reduce((acc, d) => acc + (d[1] as number), 0);
    const expectedTotal = data.values.reduce((acc, d) => acc + (d[0] as number), 0);

    // columns: baseline, deviation, entity
    // console.log('data', data);
    const augmented = data.values.map((d) => {
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

    return augmented.filter((d) => d.isSignificant);
  }, [data, field]);

  const toggleItem = (filter: string) => {
    const filterName = `${iframeID}__${filter}`;
    if (!filters[filterName]) {
      state.actions.setCrossfilter({ id: filterName, filter });
    } else {
      state.actions.setCrossfilter({ id: filterName, filter: '' });
    }
  };

  if (significantData) {
    return (
      <>
        {significantData.map((d) => {
          const value = d.value as string;
          const isSelected = Object.values(filters).includes(`${field}=="${value}"`);
          return (
            <div key={value} css={{ padding: '2px', display: 'inline-block' }}>
              <EuiBadge
                color={isSelected ? 'primary' : 'lightgray'}
                onClick={() => toggleItem(`${field}=="${d.value}"`)}
              >
                {field}:{value}
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

/**
 * Calculates the cumulative distribution function (CDF) for the chi-squared distribution.
 *
 * This approximation evaluates the probability of observing a chi-squared statistic
 * less than or equal to the given `x` for a specified number of degrees of freedom (`df`).
 * The calculation uses the series expansion of the incomplete gamma function, which is
 * proportional to the chi-squared distribution's CDF.
 *
 * @param {number} x - The chi-squared statistic to evaluate (non-negative).
 * @param {number} df - Degrees of freedom for the chi-squared distribution (positive even integer).
 * @returns {number} The cumulative probability (0 ≤ result ≤ 1).
 */
function chiSquaredCDF(x: number, df: number): number {
  // Guard against invalid inputs: the chi-squared statistic must be non-negative.
  if (x < 0) return 0;

  // Halve the chi-squared statistic for use in the series expansion.
  const m = x / 2.0;

  // Start with the first term in the series (e^(-m)).
  let sum = Math.exp(-m); // This is the zeroth term of the series.
  let term = sum; // Current term in the series expansion.

  // Iterate over the series terms to calculate the cumulative sum.
  // The loop runs for `df / 2` iterations, representing the degrees of freedom.
  for (let i = 1; i <= df / 2; i++) {
    // Calculate the next term in the series using the recurrence relation:
    // term = term * (m / i), where `i` represents the iteration index.
    term *= m / i;
    sum += term; // Add the current term to the cumulative sum.
  }

  // The result is the cumulative probability, capped at 1 (as probabilities cannot exceed 1).
  return Math.min(sum, 1);
}
