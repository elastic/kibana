/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { IMetricAggConfig } from './metric_agg_type';
import { getCountMetricAgg } from './count';

function makeAgg(emptyAsNull: boolean = false, timeShift?: moment.Duration): IMetricAggConfig {
  return {
    getTimeShift() {
      return timeShift;
    },
    params: {
      emptyAsNull,
    },
  } as IMetricAggConfig;
}

function getBucket(value: number | undefined, timeShift?: moment.Duration) {
  const suffix = timeShift ? `_${timeShift.asMilliseconds()}` : '';
  return { ['doc_count' + suffix]: value };
}

describe('Count', () => {
  it('should return the value for a non-shifted bucket', () => {
    const agg = getCountMetricAgg();
    expect(agg.getValue(makeAgg(), getBucket(1000))).toBe(1000);
  });

  it('should return the value for a shifted bucket', () => {
    const agg = getCountMetricAgg();
    const shift = moment.duration(1800000);
    expect(agg.getValue(makeAgg(false, shift), getBucket(1000, shift))).toBe(1000);
  });

  describe('emptyAsNull', () => {
    it('should return null if the value is 0 and the flag is enabled', () => {
      const agg = getCountMetricAgg();
      expect(agg.getValue(makeAgg(true), getBucket(0))).toBe(null);
    });

    it('should return null if the value is undefined and the flag is enabled', () => {
      const agg = getCountMetricAgg();
      expect(agg.getValue(makeAgg(true), getBucket(undefined))).toBe(null);
    });

    it('should return null if the value is 0 and the flag is enabled on a shifted count', () => {
      const agg = getCountMetricAgg();
      const shift = moment.duration(1800000);
      expect(agg.getValue(makeAgg(true, shift), getBucket(0, shift))).toBe(null);
    });

    it('should return null if the value is undefined and the flag is enabled on a shifted count', () => {
      const agg = getCountMetricAgg();
      const shift = moment.duration(1800000);
      expect(agg.getValue(makeAgg(true, shift), getBucket(undefined, shift))).toBe(null);
    });

    it('should return 0 if the value is 0 and the flag is disabled', () => {
      const agg = getCountMetricAgg();
      expect(agg.getValue(makeAgg(false), getBucket(0))).toBe(0);
    });

    it('should return 0 if the value is undefined and the flag is disabled', () => {
      const agg = getCountMetricAgg();
      expect(agg.getValue(makeAgg(false), getBucket(undefined))).toBe(0);
    });

    it('should return 0 if the value is 0 and the flag is disabled on a shifted count', () => {
      const agg = getCountMetricAgg();
      const shift = moment.duration(1800000);
      expect(agg.getValue(makeAgg(false, shift), getBucket(undefined, shift))).toBe(0);
    });

    it('should return 0 if the value is undefined and the flag is disabled on a shifted count', () => {
      const agg = getCountMetricAgg();
      const shift = moment.duration(1800000);
      expect(agg.getValue(makeAgg(false, shift), getBucket(undefined, shift))).toBe(0);
    });
  });
});
