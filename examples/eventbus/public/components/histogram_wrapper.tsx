/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

import { OrdinalHistogram } from './ordinal_histogram';
import { QuantitativeHistogram } from './quantitative_histogram';

interface SelectedField {
  name: string;
  type: string;
}

export const HistogramWrapper: FC = () => {
  const state = useEventBusExampleState();

  const chartWidth = state.useState((s) => s.chartWidth);

  const groupedFields = state.useState((s) => {
    const selectedFields = Object.entries(s.allFields)
      .filter(([name, type]) => {
        return s.selectedFields.includes(name) && (type === 'keyword' || type === 'long');
      })
      .map((d) => ({ name: d[0], type: d[1] }));

    // regroup keyword fields into groups of 3
    return selectedFields.reduce<SelectedField[][]>((acc, field, i) => {
      if (i % 4 === 0) {
        acc.push([]);
      }
      acc[acc.length - 1].push(field);
      return acc;
    }, []);
  });
  // console.log('groupedFields', groupedFields);

  return (
    <>
      {groupedFields.map((g, i) => (
        <div key={`row_${i}`} css={{ position: 'relative', padding: '5px' }}>
          {g.map((field) => (
            <div
              key={field.name}
              css={{
                display: 'inline-block',
                position: 'relative',
                width: `${Math.round(chartWidth / g.length) - 15}px`,
              }}
            >
              {field.type === 'keyword' && (
                <OrdinalHistogram
                  field={field.name}
                  width={Math.round(chartWidth / g.length) - 20}
                  height={150}
                />
              )}
              {field.type === 'long' && (
                <QuantitativeHistogram
                  field={field.name}
                  width={Math.round(chartWidth / g.length) - 20}
                  height={150}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
};
