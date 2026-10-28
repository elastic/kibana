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
      description: 'Median of bytes by machine.os.keyword',
      icon: 'chartBarVertical',
      breakdown: 'machine.os.keyword',
    });
  });

  test('finds the breakdown of an ES|QL pie chart from its configuration', () => {
    const panel = lensPanel({
      visualizationType: 'lnsPie',
      state: {
        visualization: {
          shape: 'donut',
          layers: [{ layerId: 'layer1', primaryGroups: ['os'], metrics: ['count'] }],
        },
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                columns: [
                  { columnId: 'os', fieldName: 'machine.os.keyword', meta: { type: 'string' } },
                  { columnId: 'count', fieldName: 'Request Count', meta: { type: 'number' } },
                ],
              },
            },
          },
        },
      },
    });
    expect(describePanel(panel)).toEqual({
      description: 'Request Count by machine.os.keyword',
      icon: 'chartPie',
      breakdown: 'machine.os.keyword',
    });
  });

  test('finds the breakdown of an ES|QL bar chart from its split accessor', () => {
    const panel = lensPanel({
      visualizationType: 'lnsXY',
      state: {
        visualization: {
          layers: [
            {
              layerId: 'layer1',
              seriesType: 'bar_stacked',
              xAccessor: 'time',
              accessors: ['count'],
              splitAccessors: ['code'],
            },
          ],
        },
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                columns: [
                  { columnId: 'time', fieldName: 'bucket', meta: { type: 'date' } },
                  { columnId: 'code', fieldName: 'response.keyword', meta: { type: 'string' } },
                  { columnId: 'count', fieldName: 'Request Count', meta: { type: 'number' } },
                ],
              },
            },
          },
        },
      },
    });
    expect(describePanel(panel).breakdown).toBe('response.keyword');
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
      description: 'Count of records by OS',
      icon: 'chartPie',
      breakdown: 'OS',
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
    expect(describePanel(panel).description).toBe('Count of records');
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
    expect(describePanel(panel).description).toBe('avg_bytes');
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
