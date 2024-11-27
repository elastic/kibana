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

export const HistogramWrapper: FC = () => {
  const state = useEventBusExampleState();

  const chartWidth = state.useState((s) => s.chartWidth);

  const groupedKeywordFields = state.useState((s) => {
    // console.log('allFields', s.allFields);
    const keywordFields = Object.entries(s.allFields)
      .filter(([name, type]) => {
        return s.selectedFields.includes(name) && type === 'keyword';
      })
      .map((d) => d[0]);

    // regroup keyword fields into groups of 3
    return keywordFields.reduce<string[][]>((acc, field, i) => {
      if (i % 4 === 0) {
        acc.push([]);
      }
      acc[acc.length - 1].push(field);
      return acc;
    }, []);
  });
  // console.log('keywordFields', groupedKeywordFields);

  return (
    <>
      {groupedKeywordFields.map((g, i) => (
        <div key={`row_${i}`} css={{ position: 'relative', padding: '5px' }}>
          {g.map((field) => (
            <div
              key={field}
              css={{
                display: 'inline-block',
                position: 'relative',
                width: `${Math.round(chartWidth / g.length) - 15}px`,
              }}
            >
              <OrdinalHistogram
                field={field}
                width={Math.round(chartWidth / g.length) - 20}
                height={150}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );
};
