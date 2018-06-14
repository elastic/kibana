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

import expect from 'expect.js';

import {
  reverseSortDirection,
  reverseSortDirective
} from '../sorting';


describe('context app', function () {
  describe('function reverseSortDirection', function () {
    it('should reverse a direction given as a string', function () {
      expect(reverseSortDirection('asc')).to.eql('desc');
      expect(reverseSortDirection('desc')).to.eql('asc');
    });

    it('should reverse a direction given in an option object', function () {
      expect(reverseSortDirection({ order: 'asc' })).to.eql({ order: 'desc' });
      expect(reverseSortDirection({ order: 'desc' })).to.eql({ order: 'asc' });
    });

    it('should preserve other properties than `order` in an option object', function () {
      expect(reverseSortDirection({
        order: 'asc',
        other: 'field',
      })).to.have.property('other', 'field');
    });
  });

  describe('function reverseSortDirective', function () {
    it('should return direction `asc` when given just `_score`', function () {
      expect(reverseSortDirective('_score')).to.eql({ _score: 'asc' });
    });

    it('should return direction `desc` when given just a field name', function () {
      expect(reverseSortDirective('field1')).to.eql({ field1: 'desc' });
    });

    it('should reverse direction when given an object', function () {
      expect(reverseSortDirective({ field1: 'asc' })).to.eql({ field1: 'desc' });
    });
  });
});
