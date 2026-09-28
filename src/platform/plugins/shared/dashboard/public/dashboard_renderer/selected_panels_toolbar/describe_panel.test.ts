/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { describePanel, getPanelTitle } from './describe_panel';

const lensPanel = (attributes: Record<string, unknown>) => ({
  getFullAttributes: () => attributes,
});

const formBased = (columns: Record<string, unknown>) => ({
  formBased: { layers: { layer1: { columns } } },
});

describe('describePanel', () => {
  test('describes a bar chart by its metric and breakdown, skipping the time axis', () => {
    const panel = lensPanel({
      visualizationType: 'lnsXY',
      state: {
        visualization: { layers: [{ seriesType: 'bar_stacked' }] },
        datasourceStates: formBased({
          time: { label: '@timestamp', isBucketed: true, dataType: 'date' },
          os: {
            label: 'Top 5 values of machine.os.keyword',
            isBucketed: true,
            dataType: 'string',
            sourceField: 'machine.os.keyword',
          },
          bytes: { label: 'Median of bytes', isBucketed: false, dataType: 'number' },
        }),
      },
    });
    expect(describePanel(panel)).toEqual({
      description: 'Bar chart · Median of bytes by machine.os.keyword',
      icon: 'chartBarVertical',
    });
  });

  test('uses the custom label of a breakdown when there is one', () => {
    const panel = lensPanel({
      visualizationType: 'lnsPie',
      state: {
        visualization: { shape: 'donut' },
        datasourceStates: formBased({
          os: { label: 'OS', customLabel: true, isBucketed: true, sourceField: 'machine.os' },
          count: { label: 'Count of records', isBucketed: false },
        }),
      },
    });
    expect(describePanel(panel)).toEqual({
      description: 'Donut chart · Count of records by OS',
      icon: 'chartPie',
    });
  });

  test('describes a time series without a breakdown by its metric only', () => {
    const panel = lensPanel({
      visualizationType: 'lnsXY',
      state: {
        visualization: { preferredSeriesType: 'line' },
        datasourceStates: formBased({
          time: { label: '@timestamp', isBucketed: true, dataType: 'date' },
          count: { label: 'Count of records', isBucketed: false },
        }),
      },
    });
    expect(describePanel(panel).description).toBe('Line chart · Count of records');
  });

  test('reads ES|QL columns', () => {
    const panel = lensPanel({
      visualizationType: 'lnsXY',
      state: {
        visualization: { layers: [{ seriesType: 'area' }] },
        datasourceStates: {
          textBased: {
            layers: { layer1: { columns: [{ fieldName: 'avg_bytes', meta: { type: 'number' } }] } },
          },
        },
      },
    });
    expect(describePanel(panel).description).toBe('Area chart · avg_bytes');
  });

  test('falls back to a generic name', () => {
    expect(describePanel({})).toEqual({ description: 'Chart', icon: 'chartBarVertical' });
  });
});

describe('getPanelTitle', () => {
  test('treats empty titles as missing and falls back to the default, then the saved title', () => {
    expect(
      getPanelTitle({
        title$: new BehaviorSubject(''),
        defaultTitle$: new BehaviorSubject('Response codes'),
      })
    ).toBe('Response codes');
    expect(
      getPanelTitle({
        title$: new BehaviorSubject('  '),
        getFullAttributes: () => ({ title: 'Bytes over time' }),
      })
    ).toBe('Bytes over time');
    expect(getPanelTitle({ title$: new BehaviorSubject('') })).toBeUndefined();
  });
});
