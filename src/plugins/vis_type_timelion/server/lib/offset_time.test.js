/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { preprocessOffset } from './offset_time';

describe('offset', () => {
  describe('preprocessOffset', () => {
    const from = moment('2018-01-01T00:00:00.000Z').valueOf();
    const to = moment('2018-01-01T00:15:00.000Z').valueOf();

    test('throws error when no number is provided', () => {
      expect(() => preprocessOffset('timerange', from, to)).to.throwError();
    });

    test('throws error when zero is provided', () => {
      expect(() => preprocessOffset('timerange:0', from, to)).to.throwError();
    });

    test('throws error when factor is larger than zero', () => {
      expect(() => preprocessOffset('timerange:1', from, to)).to.throwError();
    });

    test('throws error with malformed', () => {
      expect(() => preprocessOffset('timerange:notANumber', from, to)).to.throwError();
    });

    test('does not modify offset when value is not requesting relative offset', () => {
      const offset = '-1d';
      expect(preprocessOffset(offset, from, to)).to.eql(offset);
    });

    test('converts offset when value is requesting relative offset with multiplier', () => {
      const offset = 'timerange:-2';
      expect(preprocessOffset(offset, from, to)).to.eql('-1800s');
    });
  });
});
