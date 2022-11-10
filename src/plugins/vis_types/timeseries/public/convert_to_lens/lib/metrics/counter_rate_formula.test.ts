/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { Metric } from '../../../../common/types';
import { buildCounterRateFormula } from './counter_rate_formula';
import { SUPPORTED_METRICS } from './supported_metrics';

describe('buildCounterRateFormula', () => {
  test('should return correct formula for counter rate', () => {
    const dataView = stubLogstashDataView;
    const metric: Metric = {
      id: 'some-id',
      type: TSVB_METRIC_TYPES.POSITIVE_RATE,
      unit: '1h',
    };

    const formula = buildCounterRateFormula(
      SUPPORTED_METRICS[metric.type]!.name,
      dataView.fields[0].name,
      {}
    );
    expect(formula).toStrictEqual('counter_rate(max(bytes))');
  });
});
