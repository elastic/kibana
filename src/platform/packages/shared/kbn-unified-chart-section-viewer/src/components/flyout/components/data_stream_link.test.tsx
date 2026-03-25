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
import { DataStreamLink } from './data_stream_link';

describe('DataStreamLink', () => {
  const noUrl = jest.fn(() => undefined);
  const withUrl = jest.fn((name: string) => `/app/streams/${name}`);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty values', () => {
    it('renders "-" when dataStream is undefined', () => {
      render(<DataStreamLink getStreamUrl={noUrl} />);

      expect(screen.getByTestId('metricsDataStreamEmpty')).toHaveTextContent('-');
      expect(noUrl).not.toHaveBeenCalled();
    });

    it('renders "-" when dataStream is an empty string', () => {
      render(<DataStreamLink dataStream="" getStreamUrl={noUrl} />);

      expect(screen.getByTestId('metricsDataStreamEmpty')).toHaveTextContent('-');
    });
  });

  describe('link rendering', () => {
    it('renders a link when getStreamUrl returns a URL', () => {
      render(<DataStreamLink dataStream="metrics-system.cpu-default" getStreamUrl={withUrl} />);

      const link = screen.getByTestId('metricsDataStreamLink');
      expect(link).toHaveAttribute('href', '/app/streams/metrics-system.cpu-default');
      expect(screen.getByText('metrics-system.cpu-default')).toBeInTheDocument();
    });

    it('renders plain text when getStreamUrl returns undefined', () => {
      render(<DataStreamLink dataStream="metrics-system.cpu-default" getStreamUrl={noUrl} />);

      expect(screen.queryByTestId('metricsDataStreamLink')).not.toBeInTheDocument();
      expect(screen.getByTestId('metricsDataStreamText')).toHaveTextContent(
        'metrics-system.cpu-default'
      );
    });
  });
});
