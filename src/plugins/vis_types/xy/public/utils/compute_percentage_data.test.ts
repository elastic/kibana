/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { computePercentageData } from './compute_percentage_data';

const rowsOneMetric = [
  {
    'col-0-4': 'Kibana Airlines',
    'col-1-1': 85,
  },
  {
    'col-0-4': 'ES-Air',
    'col-1-1': 84,
  },
  {
    'col-0-4': 'Logstash Airways',
    'col-1-1': 82,
  },
  {
    'col-0-4': 'JetBeats',
    'col-1-1': 81,
  },
];

const twoMetricsRows = [
  {
    'col-0-4': 'ES-Air',
    'col-1-5': 10,
    'col-2-1': 71,
    'col-3-1': 1,
  },
  {
    'col-0-4': 'ES-Air',
    'col-1-5': 9,
    'col-2-1': 14,
    'col-3-1': 1,
  },
  {
    'col-0-4': 'Kibana Airlines',
    'col-1-5': 5,
    'col-2-1': 71,
    'col-3-1': 0,
  },
  {
    'col-0-4': 'Kibana Airlines',
    'col-1-5': 8,
    'col-2-1': 13,
    'col-3-1': 1,
  },
  {
    'col-0-4': 'JetBeats',
    'col-1-5': 11,
    'col-2-1': 72,
    'col-3-1': 0,
  },
  {
    'col-0-4': 'JetBeats',
    'col-1-5': 12,
    'col-2-1': 9,
    'col-3-1': 0,
  },
  {
    'col-0-4': 'Logstash Airways',
    'col-1-5': 5,
    'col-2-1': 71,
    'col-3-1': 1,
  },
  {
    'col-0-4': 'Logstash Airways',
    'col-1-5': 7,
    'col-2-1': 10,
    'col-3-1': 0,
  },
];

describe('computePercentageData', () => {
  it('returns ratio 1 if there is only one metric in the axis', () => {
    const data = computePercentageData(rowsOneMetric, 'col-0-4', ['col-1-1']);
    expect(data).toStrictEqual([
      {
        'col-0-4': 'Kibana Airlines',
        'col-1-1': 1,
      },
      {
        'col-0-4': 'ES-Air',
        'col-1-1': 1,
      },
      {
        'col-0-4': 'Logstash Airways',
        'col-1-1': 1,
      },
      {
        'col-0-4': 'JetBeats',
        'col-1-1': 1,
      },
    ]);
  });

  it('returns correct ratio if there are two metrics in the same axis with no small multiples', () => {
    const data = computePercentageData(twoMetricsRows, 'col-0-4', ['col-1-5', 'col-2-1']);
    expect(data).toStrictEqual([
      {
        'col-0-4': 'ES-Air',
        'col-1-5': 0.09615384615384616,
        'col-2-1': 0.6826923076923077,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'ES-Air',
        'col-1-5': 0.08653846153846154,
        'col-2-1': 0.1346153846153846,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'Kibana Airlines',
        'col-1-5': 0.05154639175257732,
        'col-2-1': 0.7319587628865979,
        'col-3-1': 0,
      },
      {
        'col-0-4': 'Kibana Airlines',
        'col-1-5': 0.08247422680412371,
        'col-2-1': 0.13402061855670103,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'JetBeats',
        'col-1-5': 0.10576923076923077,
        'col-2-1': 0.6923076923076923,
        'col-3-1': 0,
      },
      {
        'col-0-4': 'JetBeats',
        'col-1-5': 0.11538461538461539,
        'col-2-1': 0.08653846153846154,
        'col-3-1': 0,
      },
      {
        'col-0-4': 'Logstash Airways',
        'col-1-5': 0.053763440860215055,
        'col-2-1': 0.7634408602150538,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'Logstash Airways',
        'col-1-5': 0.07526881720430108,
        'col-2-1': 0.10752688172043011,
        'col-3-1': 0,
      },
    ]);
  });

  it('returns correct ratio if there are two metrics in the same axis with small multiples', () => {
    const data = computePercentageData(
      twoMetricsRows,
      'col-0-4',
      ['col-1-5', 'col-2-1'],
      'col-3-1'
    );
    expect(data).toStrictEqual([
      {
        'col-0-4': 'ES-Air',
        'col-1-5': 0.09615384615384616,
        'col-2-1': 0.6826923076923077,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'ES-Air',
        'col-1-5': 0.08653846153846154,
        'col-2-1': 0.1346153846153846,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'Kibana Airlines',
        'col-1-5': 0.06578947368421052,
        'col-2-1': 0.9342105263157895,
        'col-3-1': 0,
      },
      {
        'col-0-4': 'Kibana Airlines',
        'col-1-5': 0.38095238095238093,
        'col-2-1': 0.6190476190476191,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'JetBeats',
        'col-1-5': 0.10576923076923077,
        'col-2-1': 0.6923076923076923,
        'col-3-1': 0,
      },
      {
        'col-0-4': 'JetBeats',
        'col-1-5': 0.11538461538461539,
        'col-2-1': 0.08653846153846154,
        'col-3-1': 0,
      },
      {
        'col-0-4': 'Logstash Airways',
        'col-1-5': 0.06578947368421052,
        'col-2-1': 0.9342105263157895,
        'col-3-1': 1,
      },
      {
        'col-0-4': 'Logstash Airways',
        'col-1-5': 0.4117647058823529,
        'col-2-1': 0.5882352941176471,
        'col-3-1': 0,
      },
    ]);
  });
});
