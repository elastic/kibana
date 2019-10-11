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
import { isDuration } from './durations';

describe('durations', () => {
  describe('isDuration', () => {
    test('should return true for valid duration formats', () => {
      expect(isDuration('ps,m,2')).toBeTruthy();
      expect(isDuration('h,h,1')).toBeTruthy();
      expect(isDuration('m,d,')).toBeTruthy();
      expect(isDuration('s,Y,4')).toBeTruthy();
      expect(isDuration('ps,humanize,')).toBeTruthy();
    });

    test('should return false for invalid duration formats', () => {
      expect(isDuration('ps,j,2')).toBeFalsy();
      expect(isDuration('i,h,1')).toBeFalsy();
      expect(isDuration('m,d')).toBeFalsy();
      expect(isDuration('s')).toBeFalsy();
      expect(isDuration('humanize,s,2')).toBeFalsy();
    });
  });
});
