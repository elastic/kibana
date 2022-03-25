/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPattern, IndexPatternField } from 'src/plugins/data/public';
import { PanelData } from '../../../../common/types';
import { TimeseriesVisParams } from '../../../types';
import { convertSeriesToDataTable, addMetaToColumns } from './convert_series_to_datatable';

jest.mock('../../../services', () => {
  return {
    getDataStart: jest.fn(() => {
      return {
        indexPatterns: jest.fn(),
        query: {
          timefilter: {
            timefilter: {
              getTime: jest.fn(() => {
                return {
                  from: '2021-04-30T16:42:24.502Z',
                  to: '2021-05-05T14:42:24.502Z',
                };
              }),
            },
          },
        },
      };
    }),
  };
});

describe('convert series to datatables', () => {
  let indexPattern: IndexPattern;

  beforeEach(() => {
    const fieldMap: Record<string, IndexPatternField> = {
      test1: { name: 'test1', spec: { type: 'date', name: 'test1' } } as IndexPatternField,
      test2: {
        name: 'test2',
        spec: { type: 'number', name: 'Average of test2' },
      } as IndexPatternField,
      test3: { name: 'test3', spec: { type: 'boolean', name: 'test3' } } as IndexPatternField,
    };

    const getFieldByName = (name: string): IndexPatternField | undefined => fieldMap[name];
    indexPattern = {
      id: 'index1',
      title: 'index1',
      timeFieldName: 'timestamp',
      getFieldByName,
    } as IndexPattern;
  });

  describe('addMetaColumns()', () => {
    test('adds the correct meta to a date column', () => {
      const columns = [{ id: 0, name: 'test1', isMetric: true, type: 'date_histogram' }];
      const columnsWithMeta = addMetaToColumns(columns, indexPattern);
      expect(columnsWithMeta).toEqual([
        {
          id: '0',
          meta: {
            field: 'test1',
            index: 'index1',
            source: 'esaggs',
            sourceParams: {
              enabled: true,
              indexPatternId: 'index1',
              type: 'date_histogram',
              schema: 'metric',
              params: {
                timeRange: {
                  from: '2021-04-30T16:42:24.502Z',
                  to: '2021-05-05T14:42:24.502Z',
                },
              },
            },
            type: 'date',
          },
          name: 'test1',
        },
      ]);
    });

    test('adds the correct meta to a non date column', () => {
      const columns = [{ id: 1, name: 'test2', isMetric: true, type: 'avg' }];
      const columnsWithMeta = addMetaToColumns(columns, indexPattern);
      expect(columnsWithMeta).toEqual([
        {
          id: '1',
          meta: {
            field: 'Average of test2',
            index: 'index1',
            source: 'esaggs',
            sourceParams: {
              enabled: true,
              indexPatternId: 'index1',
              type: 'avg',
              schema: 'metric',
              params: {
                field: 'Average of test2',
              },
            },
            type: 'number',
          },
          name: 'test2',
        },
      ]);
    });

    test('adds the correct meta for a split column', () => {
      const columns = [{ id: 2, name: 'test3', isMetric: false, type: 'terms' }];
      const columnsWithMeta = addMetaToColumns(columns, indexPattern);
      expect(columnsWithMeta).toEqual([
        {
          id: '2',
          meta: {
            field: 'test3',
            index: 'index1',
            source: 'esaggs',
            sourceParams: {
              enabled: true,
              indexPatternId: 'index1',
              type: 'terms',
              schema: 'group',
              params: {
                field: 'test3',
              },
            },
            type: 'boolean',
          },
          name: 'test3',
        },
      ]);
    });
  });

  describe('convertSeriesToDataTable()', () => {
    const model = {
      series: [
        {
          formatter: 'number',
          id: 'series1',
          label: '',
          line_width: 1,
          metrics: [
            {
              field: 'test2',
              id: 'series1',
              type: 'avg',
            },
          ],
          split_mode: 'terms',
          terms_field: 'Cancelled',
        },
      ],
    } as TimeseriesVisParams;
    const series = [
      {
        id: 'series1:0',
        label: 0,
        splitByLabel: 'Average of test2',
        labelFormatted: 'false',
        data: [
          [1616454000000, 0],
          [1616457600000, 5],
          [1616461200000, 7],
          [1616464800000, 8],
        ],
        seriesId: 'series1',
        isSplitByTerms: true,
      },
      {
        id: 'series1:1',
        label: 1,
        splitByLabel: 'Average of test2',
        labelFormatted: 'true',
        data: [
          [1616454000000, 10],
          [1616457600000, 12],
          [1616461200000, 1],
          [1616464800000, 14],
        ],
        seriesId: 'series1',
        isSplitByTerms: true,
      },
    ] as unknown as PanelData[];
    test('creates one table for one layer series with the correct columns', async () => {
      const tables = await convertSeriesToDataTable(model, series, indexPattern);
      expect(Object.keys(tables).sort()).toEqual([model.series[0].id].sort());

      expect(tables.series1.columns.length).toEqual(3);
      expect(tables.series1.rows.length).toEqual(8);
    });

    test('the table rows for a series with term aggregation should be a combination of the different terms', async () => {
      const tables = await convertSeriesToDataTable(model, series, indexPattern);
      expect(Object.keys(tables).sort()).toEqual([model.series[0].id].sort());

      expect(tables.series1.rows.length).toEqual(8);
      const expected1 = series[0].data.map((d) => ({
        '0': d[0],
        '1': d[1],
        '2': parseInt([series[0].label].flat()[0], 10),
      }));
      const expected2 = series[1].data.map((d) => ({
        '0': d[0],
        '1': d[1],
        '2': parseInt([series[1].label].flat()[0], 10),
      }));
      expect(tables.series1.rows).toEqual([...expected1, ...expected2]);
    });

    test('for series aggregation split by terms, no column is added', async () => {
      const updatedModel = {
        ...model,
        series: [
          {
            ...model.series[0],
            metrics: [
              {
                field: 'test2',
                id: 'series1',
                function: 'sum',
                type: 'series_agg',
              },
            ],
          },
        ],
      } as TimeseriesVisParams;
      const tables = await convertSeriesToDataTable(updatedModel, series, indexPattern);
      expect(tables.series1.columns.length).toEqual(2);
    });
  });
});
