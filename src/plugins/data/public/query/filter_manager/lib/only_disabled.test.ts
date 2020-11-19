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

import { onlyDisabledFiltersChanged } from './only_disabled';
import { Filter } from '../../../../common';

describe('filter manager utilities', () => {
  describe('onlyDisabledFiltersChanged()', () => {
    test('should return true if all filters are disabled', () => {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: true } }] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(true);
    });

    test('should return false if there are no old filters', () => {
      const newFilters = [{ meta: { disabled: false } }] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, undefined)).toBe(false);
    });

    test('should return false if there are no new filters', () => {
      const filters = [{ meta: { disabled: false } }] as Filter[];

      expect(onlyDisabledFiltersChanged(undefined, filters)).toBe(false);
    });

    test('should return false if all filters are not disabled', () => {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: false } }] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(false);
    });

    test('should return false if only old filters are disabled', () => {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: false } }] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(false);
    });

    test('should return false if new filters are not disabled', () => {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: true } }] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(false);
    });

    test('should return true when all removed filters were disabled', () => {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(true);
    });

    test('should return false when all removed filters were not disabled', () => {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } },
      ] as Filter[];
      const newFilters = [] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(false);
    });

    test('should return true if all changed filters are disabled', () => {
      const filters = [
        { meta: { disabled: true, negate: false } },
        { meta: { disabled: true, negate: false } },
      ] as Filter[];
      const newFilters = [
        { meta: { disabled: true, negate: true } },
        { meta: { disabled: true, negate: true } },
      ] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(true);
    });

    test('should return false if all filters remove were not disabled', () => {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: false } }] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(false);
    });

    test('should return false when all removed filters are not disabled', () => {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: false } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [] as Filter[];

      expect(onlyDisabledFiltersChanged(newFilters, filters)).toBe(false);
    });

    test('should not throw with null filters', () => {
      const filters = [null, { meta: { disabled: true } }] as Filter[];
      const newFilters = [] as Filter[];

      expect(() => {
        onlyDisabledFiltersChanged(newFilters, filters);
      }).not.toThrowError();
    });
  });
});
