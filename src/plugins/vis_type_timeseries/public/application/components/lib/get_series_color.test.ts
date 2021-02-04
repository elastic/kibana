/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSeriesColor } from './get_series_color';

describe('Get Series Colors Function', () => {
  it('Should return null if user has not assigned any color', () => {
    const color = getSeriesColor([], 'Logstash Airways', '');
    expect(color).toEqual(null);
  });

  it('Should return null if user has not assigned any color for the specific label', () => {
    const color = getSeriesColor(
      [
        {
          id: '61ca57f1-469d-11e7-af02-69e470af7417:Logstash Airways',
          overwrite: {
            'Logstash Airways': '#F9934E',
          },
        },
      ],
      'other label',
      ''
    );
    expect(color).toEqual(null);
  });

  it('Should return the color if user has assigned a color for the specific label', () => {
    const color = getSeriesColor(
      [
        {
          id: '61ca57f1-469d-11e7-af02-69e470af7417:Logstash Airways',
          overwrite: {
            'Logstash Airways': '#F9934E',
          },
        },
      ],
      'Logstash Airways',
      ''
    );
    expect(color).toEqual('#F9934E');
  });

  it('Should return the color if user has assigned a color for the specific formatted label', () => {
    const color = getSeriesColor(
      [
        {
          id: '61ca57f1-469d-11e7-af02-69e470af7417:Logstash Airways',
          overwrite: {
            true: '#F9934E',
          },
        },
      ],
      '1',
      'true'
    );
    expect(color).toEqual('#F9934E');
  });
});
