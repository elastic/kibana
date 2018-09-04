/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { assertValidInterval, intervalFromNow } from './task_intervals';

describe('taskIntervals', () => {
  describe('assertValidInterval', () => {
    test('it accepts intervals in the form `Nm`', () => {
      expect(() => assertValidInterval(`${_.random(1000)}m`)).not.toThrow();
    });

    test('it rejects intervals are not of the form `Nm`', () => {
      expect(() => assertValidInterval(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {numbrer}m. Example: 5m/
      );
      expect(() => assertValidInterval(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {numbrer}m. Example: 5m/
      );
    });
  });

  describe('intervalFromNow', () => {
    test('it returns the current date plus n minutes', () => {
      const mins = _.random(1, 100);
      const expected = Date.now() + mins * 60 * 1000;
      const nextRun = intervalFromNow(`${mins}m`).getTime();
      expect(Math.abs(nextRun - expected)).toBeLessThan(100);
    });

    test('it rejects intervals are not of the form `Nm`', () => {
      expect(() => intervalFromNow(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {numbrer}m. Example: 5m/
      );
      expect(() => intervalFromNow(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {numbrer}m. Example: 5m/
      );
    });
  });
});
