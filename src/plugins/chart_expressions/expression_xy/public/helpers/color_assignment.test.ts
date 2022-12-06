/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getColorAssignments } from './color_assignment';
import type { DataLayerConfig } from '../../common';
import { LayerTypes } from '../../common/constants';
import { Datatable } from '@kbn/expressions-plugin/common';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { LayersFieldFormats } from './layers';

describe('color_assignment', () => {
  const tables: Record<string, Datatable> = {
    '1': {
      type: 'datatable',
      columns: [
        { id: 'split1', name: '', meta: { type: 'number' } },
        { id: 'y1', name: '', meta: { type: 'number' } },
        { id: 'y2', name: '', meta: { type: 'number' } },
      ],
      rows: [
        { split1: 1 },
        { split1: 2 },
        { split1: 3 },
        { split1: 1 },
        { split1: 2 },
        { split1: 3 },
      ],
    },
    '2': {
      type: 'datatable',
      columns: [
        { id: 'split2', name: '', meta: { type: 'number' } },
        { id: 'y1', name: '', meta: { type: 'number' } },
        { id: 'y2', name: '', meta: { type: 'number' } },
      ],
      rows: [
        { split2: 1 },
        { split2: 2 },
        { split2: 3 },
        { split2: 1 },
        { split2: 2 },
        { split2: 3 },
      ],
    },
  };

  const layers: DataLayerConfig[] = [
    {
      layerId: 'first',
      type: 'dataLayer',
      showLines: true,
      isHistogram: true,
      isPercentage: false,
      xScaleType: 'linear',
      seriesType: 'bar',
      isStacked: false,
      isHorizontal: false,
      palette: { type: 'palette', name: 'palette1' },
      layerType: LayerTypes.DATA,
      splitAccessors: ['split1'],
      accessors: ['y1', 'y2'],
      table: tables['1'],
    },
    {
      layerId: 'second',
      type: 'dataLayer',
      showLines: true,
      xScaleType: 'linear',
      isHistogram: true,
      isPercentage: false,
      seriesType: 'bar',
      isStacked: false,
      isHorizontal: false,
      palette: { type: 'palette', name: 'palette2' },
      layerType: LayerTypes.DATA,
      splitAccessors: ['split2'],
      accessors: ['y3', 'y4'],
      table: tables['2'],
    },
  ];

  const fieldFormats = {
    first: {
      splitSeriesAccessors: {
        split1: {
          format: { id: 'string' },
          formatter: {
            convert: (x) => x,
          } as FieldFormat,
        },
      },
    },
    second: {
      splitSeriesAccessors: {
        split2: {
          format: { id: 'string' },
          formatter: {
            convert: (x) => x,
          } as FieldFormat,
        },
      },
    },
  } as unknown as LayersFieldFormats;

  const formattedDatatables = {
    first: {
      table: tables['1'],
      formattedColumns: {},
    },
    second: {
      table: tables['2'],
      formattedColumns: {},
    },
  };

  const titles = {
    [layers[0].layerId]: {
      yTitles: {
        y1: 'test1',
        y2: 'test2',
        y3: 'test3',
        y4: 'test4',
      },
    },
    [layers[1].layerId]: {
      yTitles: {
        y1: 'test1',
        y2: 'test2',
        y3: 'test3',
        y4: 'test4',
      },
    },
  };

  describe('totalSeriesCount', () => {
    it('should calculate total number of series per palette', () => {
      const assignments = getColorAssignments(layers, titles, fieldFormats, formattedDatatables);
      // two y accessors, with 3 splitted series
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 3);
      expect(assignments.palette2.totalSeriesCount).toEqual(2 * 3);
    });

    it('should calculate total number of series spanning multible layers', () => {
      const assignments = getColorAssignments(
        [layers[0], { ...layers[1], palette: layers[0].palette }],
        titles,
        fieldFormats,
        formattedDatatables
      );
      // two y accessors, with 3 splitted series, two times
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 3 + 2 * 3);
      expect(assignments.palette2).toBeUndefined();
    });

    it('should calculate total number of series for non split series', () => {
      const assignments = getColorAssignments(
        [layers[0], { ...layers[1], palette: layers[0].palette, splitAccessors: undefined }],
        titles,
        fieldFormats,
        formattedDatatables
      );
      // two y accessors, with 3 splitted series for the first layer, 2 non splitted y accessors for the second layer
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 3 + 2);
      expect(assignments.palette2).toBeUndefined();
    });

    it('should format non-primitive values and count them correctly', () => {
      const complexObject = { aProp: 123 };
      const formatMock = jest.fn((value) => (typeof value === 'object' ? 'formatted' : value));
      const newLayers = [
        {
          ...layers[0],
          table: { ...tables['1'], rows: [{ split1: complexObject }, { split1: 'abc' }] },
        },
        layers[1],
      ];
      fieldFormats.first.splitSeriesAccessors.split1.formatter.convert = formatMock;
      const newFormattedDatatables = {
        first: {
          formattedColumns: formattedDatatables.first.formattedColumns,
          table: {
            ...formattedDatatables.first.table,
            rows: [{ split1: complexObject }, { split1: 'abc' }],
          },
        },
        second: formattedDatatables.second,
      };

      const assignments = getColorAssignments(
        newLayers,
        titles,
        fieldFormats,
        newFormattedDatatables
      );

      fieldFormats.first.splitSeriesAccessors.split1.formatter.convert = (x) => x as string;
      expect(formatMock).toHaveBeenCalledWith(complexObject);
      expect(assignments.palette1.totalSeriesCount).toEqual(2 * 2);
      expect(assignments.palette2.totalSeriesCount).toEqual(2 * 3);
      expect(formatMock).toHaveBeenCalledWith(complexObject);
    });

    it('should handle missing columns', () => {
      const newLayers = [{ ...layers[0], table: { ...tables['1'], columns: [] } }, layers[1]];
      const newFormattedDatatables = {
        first: {
          formattedColumns: formattedDatatables.first.formattedColumns,
          table: { ...formattedDatatables.first.table, columns: [] },
        },
        second: formattedDatatables.second,
      };
      const assignments = getColorAssignments(
        newLayers,
        titles,
        fieldFormats,
        newFormattedDatatables
      );

      // if the split column is missing, just assume a single split
      expect(assignments.palette1.totalSeriesCount).toEqual(2);
    });
  });

  describe('getRank', () => {
    it('should return the correct rank for a series key', () => {
      const assignments = getColorAssignments(layers, titles, fieldFormats, formattedDatatables);
      // 3 series in front of 2/y2 - 1/y1, 1/y2 and 2/y1
      expect(assignments.palette1.getRank(layers[0].layerId, '2 - test2')).toEqual(3);
      // 1 series in front of 1/y4 - 1/y3
      expect(assignments.palette2.getRank(layers[1].layerId, '1 - test4')).toEqual(1);
    });

    it('should return the correct rank for a series key spanning multiple layers', () => {
      const newLayers = [layers[0], { ...layers[1], palette: layers[0].palette }];
      const assignments = getColorAssignments(newLayers, titles, fieldFormats, formattedDatatables);
      // 3 series in front of 2/y2 - 1/y1, 1/y2 and 2/y1
      expect(assignments.palette1.getRank(newLayers[0].layerId, '2 - test2')).toEqual(3);
      // 2 series in front for the current layer (1/y3, 1/y4), plus all 6 series from the first layer
      expect(assignments.palette1.getRank(newLayers[1].layerId, '2 - test3')).toEqual(8);
    });

    it('should return the correct rank for a series without a split', () => {
      const newLayers = [
        layers[0],
        { ...layers[1], palette: layers[0].palette, splitAccessors: undefined },
      ];
      const assignments = getColorAssignments(newLayers, titles, fieldFormats, formattedDatatables);
      // 3 series in front of 2/y2 - 1/y1, 1/y2 and 2/y1
      expect(assignments.palette1.getRank(newLayers[0].layerId, '2 - test2')).toEqual(3);
      // 1 series in front for the current layer (y3), plus all 6 series from the first layer
      expect(assignments.palette1.getRank(newLayers[1].layerId, 'test4')).toEqual(7);
    });

    it('should return the correct rank for a series with a non-primitive value', () => {
      const newLayers = [
        {
          ...layers[0],
          table: { ...tables['1'], rows: [{ split1: 'abc' }, { split1: { aProp: 123 } }] },
        },
        layers[1],
      ];
      fieldFormats.first.splitSeriesAccessors.split1.formatter.convert = (value: unknown) =>
        (typeof value === 'object' ? 'formatted' : value) as string;
      const newFormattedDatatables = {
        first: {
          formattedColumns: formattedDatatables.first.formattedColumns,
          table: {
            ...formattedDatatables.first.table,
            rows: [{ split1: 'abc' }, { split1: { aProp: 123 } }],
          },
        },
        second: formattedDatatables.second,
      };

      const assignments = getColorAssignments(
        newLayers,
        titles,
        fieldFormats,
        newFormattedDatatables
      );

      fieldFormats.first.splitSeriesAccessors.split1.formatter.convert = (x) => x as string;
      // 3 series in front of (complex object)/y1 - abc/y1, abc/y2
      expect(assignments.palette1.getRank(layers[0].layerId, 'formatted - test1')).toEqual(2);
    });

    it('should handle missing columns', () => {
      const newLayers = [{ ...layers[0], table: { ...tables['1'], columns: [] } }, layers[1]];
      const newFormattedDatatables = {
        first: {
          formattedColumns: formattedDatatables.first.formattedColumns,
          table: { ...formattedDatatables.first.table, columns: [] },
        },
        second: formattedDatatables.second,
      };

      const assignments = getColorAssignments(
        newLayers,
        titles,
        fieldFormats,
        newFormattedDatatables
      );

      // if the split column is missing, assume it is the first splitted series. One series in front - 0/y1
      expect(assignments.palette1.getRank(layers[0].layerId, 'test2')).toEqual(1);
    });
  });
});
