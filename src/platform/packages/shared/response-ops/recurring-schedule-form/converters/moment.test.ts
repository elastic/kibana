/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  convertStringToMoment,
  convertStringToMomentOptional,
  convertMomentToString,
  convertMomentToStringOptional,
} from './moment';
import moment from 'moment';

describe('Moment converters', () => {
  describe('convertStringToMoment', () => {
    it('should convert ISO string to Moment', () => {
      const dateStr = '2025-06-26T12:34:56.789Z';
      const result = convertStringToMoment(dateStr);
      expect(moment.isMoment(result)).toBe(true);
      expect(result.toISOString()).toBe(dateStr);
    });
  });

  describe('convertStringToMomentOptional', () => {
    it('should convert ISO string to Moment if value is provided', () => {
      const dateStr = '2025-06-26T12:34:56.789Z';
      const result = convertStringToMomentOptional(dateStr);
      expect(moment.isMoment(result)).toBe(true);
      expect(result?.toISOString()).toBe(dateStr);
    });

    it('should return undefined if value is not provided', () => {
      const result = convertStringToMomentOptional(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('convertMomentToString', () => {
    it('should convert Moment to ISO string', () => {
      const m = moment('2025-06-26T12:34:56.789Z');
      const result = convertMomentToString(m);
      expect(result).toBe('2025-06-26T12:34:56.789Z');
    });
  });

  describe('convertMomentToStringOptional', () => {
    it('should convert Moment to ISO string if value is provided', () => {
      const m = moment('2025-06-26T12:34:56.789Z');
      const result = convertMomentToStringOptional(m);
      expect(result).toBe('2025-06-26T12:34:56.789Z');
    });

    it('should return empty string if value is not provided', () => {
      const result = convertMomentToStringOptional(undefined);
      expect(result).toBe('');
    });
  });
});
