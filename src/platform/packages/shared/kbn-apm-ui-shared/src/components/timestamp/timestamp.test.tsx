/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import moment from 'moment';
import { Timestamp } from '.';
import userEvent from '@testing-library/user-event';
import { mockNow } from '../../utils/test_helpers/mock_now';

const timestamp = 1570720000123; // Oct 10, 2019, 08:06:40.123 (UTC-7)
const absoluteTimeMilis = 'Oct 10, 2019 @ 08:06:40.123 (UTC-7)';
const relativeTime = '5 hours ago';
const tooltipTestId = 'apmUiSharedTimestampTooltip';

describe('Timestamp', () => {
  beforeAll(() => {
    mockNow(1570737000000);
    moment.tz.setDefault('America/Los_Angeles');
  });

  afterAll(() => {
    moment.tz.setDefault('');
  });

  describe('default renderMode', () => {
    it('should render both absolute and relative time correctly', async () => {
      render(<Timestamp timestamp={timestamp} />);

      const timeElement = await screen.getByText(`${absoluteTimeMilis} (${relativeTime})`);
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('renderMode as tooltip', () => {
    it('should render relative time in body and absolute time in tooltip', async () => {
      const user = userEvent.setup();
      render(<Timestamp timestamp={timestamp} renderMode="tooltip" />);

      const relativeTimeElement = screen.getByText(relativeTime);
      expect(relativeTimeElement).toBeInTheDocument();

      await user.hover(relativeTimeElement);

      const tooltipElement = await screen.findByTestId(tooltipTestId);
      expect(tooltipElement).toHaveTextContent(absoluteTimeMilis);
    });

    it('should format with precision in milliseconds by default', async () => {
      const user = userEvent.setup();
      render(<Timestamp timestamp={timestamp} renderMode="tooltip" />);

      await user.hover(screen.getByText(relativeTime));

      const tooltipElement = await screen.findByTestId(tooltipTestId);
      expect(tooltipElement).toHaveTextContent(absoluteTimeMilis);
    });

    it('should format with precision in seconds', async () => {
      const user = userEvent.setup();
      render(<Timestamp timestamp={timestamp} timeUnit="seconds" renderMode="tooltip" />);

      await user.hover(screen.getByText(relativeTime));

      const tooltipElement = await screen.findByTestId(tooltipTestId);
      expect(tooltipElement).toHaveTextContent('Oct 10, 2019 @ 08:06:40 (UTC-7)');
    });

    it('should format with precision in minutes', async () => {
      const user = userEvent.setup();
      render(<Timestamp timestamp={timestamp} timeUnit="minutes" renderMode="tooltip" />);

      await user.hover(screen.getByText(relativeTime));

      const tooltipElement = await screen.findByTestId(tooltipTestId);
      expect(tooltipElement).toHaveTextContent('Oct 10, 2019 @ 08:06 (UTC-7)');
    });
  });
});
