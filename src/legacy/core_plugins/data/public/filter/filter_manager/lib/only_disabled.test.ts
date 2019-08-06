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

import { Filter } from '@kbn/es-query';

import { onlyDisabledFiltersChanged } from './only_disabled';
import expect from '@kbn/expect';

describe('Filter Bar Directive', function() {
  describe('onlyDisabledFiltersChanged()', function() {
    it('should return true if all filters are disabled', function() {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: true } }] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(true);
    });

    it('should return false if there are no old filters', function() {
      const newFilters = [{ meta: { disabled: false } }] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, undefined)).to.be(false);
    });

    it('should return false if there are no new filters', function() {
      const filters = [{ meta: { disabled: false } }] as Filter[];
      expect(onlyDisabledFiltersChanged(undefined, filters)).to.be(false);
    });

    it('should return false if all filters are not disabled', function() {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: false } }] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(false);
    });

    it('should return false if only old filters are disabled', function() {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: false } }] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(false);
    });

    it('should return false if new filters are not disabled', function() {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: true } }] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(false);
    });

    it('should return true when all removed filters were disabled', function() {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: true } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(true);
    });

    it('should return false when all removed filters were not disabled', function() {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: false } },
      ] as Filter[];
      const newFilters = [] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(false);
    });

    it('should return true if all changed filters are disabled', function() {
      const filters = [
        { meta: { disabled: true, negate: false } },
        { meta: { disabled: true, negate: false } },
      ] as Filter[];
      const newFilters = [
        { meta: { disabled: true, negate: true } },
        { meta: { disabled: true, negate: true } },
      ] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(true);
    });

    it('should return false if all filters remove were not disabled', function() {
      const filters = [
        { meta: { disabled: false } },
        { meta: { disabled: false } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [{ meta: { disabled: false } }] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(false);
    });

    it('should return false when all removed filters are not disabled', function() {
      const filters = [
        { meta: { disabled: true } },
        { meta: { disabled: false } },
        { meta: { disabled: true } },
      ] as Filter[];
      const newFilters = [] as Filter[];
      expect(onlyDisabledFiltersChanged(newFilters, filters)).to.be(false);
    });

    it('should not throw with null filters', function() {
      const filters = [null, { meta: { disabled: true } }] as Filter[];
      const newFilters = [] as Filter[];
      expect(function() {
        onlyDisabledFiltersChanged(newFilters, filters);
      }).to.not.throwError();
    });
  });
});
