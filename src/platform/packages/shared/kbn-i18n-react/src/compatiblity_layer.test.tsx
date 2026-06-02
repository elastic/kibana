/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { FormattedRelative } from './compatiblity_layer';

const mockSelectUnit = jest.fn();
jest.mock('@formatjs/intl-utils', () => ({
  selectUnit: (...args: unknown[]) => mockSelectUnit(...args),
}));

const mockFormattedRelativeTime = jest.fn(() => null);
jest.mock('react-intl', () => ({
  FormattedRelativeTime: (props: Record<string, unknown>) => {
    mockFormattedRelativeTime(props);
    return null;
  },
}));

describe('FormattedRelative', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateIntervalInSeconds guard', () => {
    it('omits updateIntervalInSeconds for non-incrementable units to prevent react-intl throw', () => {
      mockSelectUnit.mockReturnValue({ value: -2, unit: 'day' });
      render(<FormattedRelative value={new Date()} updateIntervalInSeconds={60} />);
      expect(mockFormattedRelativeTime).toHaveBeenCalledWith(
        expect.objectContaining({ updateIntervalInSeconds: undefined })
      );
    });

    it('passes updateIntervalInSeconds for minute unit', () => {
      mockSelectUnit.mockReturnValue({ value: -5, unit: 'minute' });
      render(<FormattedRelative value={new Date()} updateIntervalInSeconds={60} />);
      expect(mockFormattedRelativeTime).toHaveBeenCalledWith(
        expect.objectContaining({ updateIntervalInSeconds: 60 })
      );
    });

    it('passes updateIntervalInSeconds for hour unit', () => {
      mockSelectUnit.mockReturnValue({ value: -2, unit: 'hour' });
      render(<FormattedRelative value={new Date()} updateIntervalInSeconds={3600} />);
      expect(mockFormattedRelativeTime).toHaveBeenCalledWith(
        expect.objectContaining({ updateIntervalInSeconds: 3600 })
      );
    });
  });
});
