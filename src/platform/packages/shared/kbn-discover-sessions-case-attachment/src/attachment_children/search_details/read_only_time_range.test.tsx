/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ReadOnlyTimeRange } from './read_only_time_range';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      settings: {
        client: {
          get: jest.fn((key) => {
            if (key === 'dateFormat') return 'YYYY-MM-DD HH:mm:ss';
            if (key === 'dateFormat:tz') return 'Browser';
            return null;
          }),
        },
      },
    },
  }),
}));

jest.mock('moment-timezone', () => {
  const originalMoment = jest.requireActual('moment-timezone');
  return {
    ...originalMoment,
    tz: {
      ...originalMoment.tz,
      guess: jest.fn(() => 'America/New_York'),
    },
  };
});

describe('ReadOnlyTimeRange', () => {
  it('renders the time range with the correct format and tooltip', () => {
    const timeRange = {
      from: '2023-10-01T00:00:00Z',
      to: '2023-10-01T12:00:00Z',
    };

    const mockedTimeZone = 'America/New_York';
    const fromCurrentTZ = '2023-09-30 20:00:00'; // Mocked formatted value for 'America/New_York'
    const toCurrentTZ = '2023-10-01 08:00:00'; // Mocked formatted value for 'America/New_York'
    const fromUTC = '2023-10-01 00:00:00'; // Mocked formatted value for UTC
    const toUTC = '2023-10-01 12:00:00'; // Mocked formatted value for UTC

    const { getByText, getByRole } = render(<ReadOnlyTimeRange timeRange={timeRange} />);

    expect(getByText(`${fromCurrentTZ} to ${toCurrentTZ}`)).toBeInTheDocument();

    const tooltip = getByRole('tooltip');
    expect(tooltip).toHaveTextContent(`From: ${fromUTC} to ${toUTC} (UTC)`);
  });
});
