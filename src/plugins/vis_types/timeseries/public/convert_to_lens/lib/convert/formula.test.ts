/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSeries } from '../__mocks__';
import { createFormulaColumn } from './formula';
import { FormulaColumn } from './types';
import { Metric } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import {
  createStubDataView,
  stubLogstashDataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashFieldSpecMap } from '@kbn/data-views-plugin/common/field.stub';

describe('createFormulaColumn', () => {
  const dataView = stubLogstashDataView;
  const dataViewWithInvalidFormats = createStubDataView({
    spec: {
      id: 'logstash-*',
      title: 'logstash-*',
      timeFieldName: 'time',
      fields: stubLogstashFieldSpecMap,
    },
  });

  dataViewWithInvalidFormats.getFormatterForField = jest.fn().mockImplementation(() => ({
    type: {
      id: 'date',
    },
  }));

  const series = createSeries();
  const seriesWithValidFormatter = createSeries({ formatter: 'percent' });
  const seriesWithInvalidFormatter = createSeries({ formatter: 'date' });

  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.MATH,
  };
  const metricWithField: Metric = {
    id: 'some-id',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[0].name,
  };

  const metricWithFieldWithUnsupportedFormat: Metric = {
    id: 'some-id',
    type: METRIC_TYPES.AVG,
    field: dataView.fields[2].name, // 'date' formatter
  };

  const formula = 'count() / 2';

  test.each<[string, Parameters<typeof createFormulaColumn>, Partial<FormulaColumn> | null]>([
    [
      'formula column',
      [formula, { series, metric, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula },
      },
    ],
    [
      'formula column with format of the field',
      [formula, { series, metric: metricWithField, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { format: { id: 'bytes' }, formula },
      },
    ],
    [
      'formula column with format of series',
      [formula, { series: seriesWithValidFormatter, metric: metricWithField, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { format: { id: 'percent' }, formula },
      },
    ],
    [
      'formula column without format if custom formatter is not supported',
      [formula, { series: seriesWithInvalidFormatter, metric: metricWithField, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula },
      },
    ],
    [
      'formula column without format if field format is not supported',
      [
        formula,
        {
          series,
          metric: metricWithFieldWithUnsupportedFormat,
          dataView: dataViewWithInvalidFormats,
        },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: { formula },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(createFormulaColumn(...input)).toBeNull();
    }
    if (Array.isArray(expected)) {
      expect(createFormulaColumn(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(createFormulaColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
