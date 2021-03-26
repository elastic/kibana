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
      };
    }),
  };
});

describe('convert series to datatables', () => {
  let indexPattern: IndexPattern;

  beforeEach(() => {
    const fieldMap: Record<string, IndexPatternField> = {
      test1: { name: 'test1', spec: { type: 'date' } } as IndexPatternField,
      test2: { name: 'test2' } as IndexPatternField,
      test3: { name: 'test3', spec: { type: 'boolean' } } as IndexPatternField,
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
      const columns = [{ id: 0, name: 'test1', isSplit: false }];
      const columnsWithMeta = addMetaToColumns(columns, indexPattern, 'count');
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
            },
            type: 'date',
          },
          name: 'test1',
        },
      ]);
    });

    test('adds the correct meta to a non date column', () => {
      const columns = [{ id: 1, name: 'Average of test2', isSplit: false }];
      const columnsWithMeta = addMetaToColumns(columns, indexPattern, 'avg');
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
            },
            type: 'number',
          },
          name: 'Average of test2',
        },
      ]);
    });

    test('adds the correct meta for a split column', () => {
      const columns = [{ id: 2, name: 'test3', isSplit: true }];
      const columnsWithMeta = addMetaToColumns(columns, indexPattern, 'avg');
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
          type: 'timeseries',
        },
      ],
    } as TimeseriesVisParams;
    const series = ([
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
    ] as unknown) as PanelData[];
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
      const expected1 = series[0].data.map((d) => {
        d.push(parseInt(series[0].label, 10));
        return d;
      });
      const expected2 = series[1].data.map((d) => {
        d.push(parseInt(series[1].label, 10));
        return d;
      });
      expect(tables.series1.rows).toEqual([...expected1, ...expected2]);
    });
  });
});
