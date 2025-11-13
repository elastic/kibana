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
import { getSiPrefixedNumber, NumberBadge } from './number_badge';

describe('NumberBadge', () => {
  describe('getSiPrefixedNumber', () => {
    it('returns the number as a string if it is less than shortenAtExpSize', () => {
      expect(getSiPrefixedNumber(123)).toBe('123');
      expect(getSiPrefixedNumber(999)).toBe('999');
    });

    it('returns the number with an SI prefix if it is equal to or greater than shortenAtExpSize', () => {
      expect(getSiPrefixedNumber(1000)).toBe('1k');
      expect(getSiPrefixedNumber(1500)).toBe('1.5k');
      expect(getSiPrefixedNumber(1_000_000)).toBe('1M');
      expect(getSiPrefixedNumber(2_500_000)).toBe('2.5M');
      expect(getSiPrefixedNumber(1_000_000_000)).toBe('1G');
      expect(getSiPrefixedNumber(7_200_000_000)).toBe('7.2G');
      expect(getSiPrefixedNumber(1_000_000_000_000)).toBe('1T');
      expect(getSiPrefixedNumber(5_300_000_000_000)).toBe('5.3T');
    });

    it('handles negative numbers correctly', () => {
      expect(getSiPrefixedNumber(-123)).toBe('-123');
      expect(getSiPrefixedNumber(-1500)).toBe('-1.5k');
      expect(getSiPrefixedNumber(-2500000)).toBe('-2.5M');
    });

    it('handles zero correctly', () => {
      expect(getSiPrefixedNumber(0)).toBe('0');
    });
  });

  describe('React component rendering', () => {
    it('renders a prefixed value when the provided value exceeds the shortenAtExpSize', () => {
      render(<NumberBadge value={123456} shortenAtExpSize={3} />);
      expect(screen.getByText(getSiPrefixedNumber(123456))).toBeDefined();
    });
  });
});
