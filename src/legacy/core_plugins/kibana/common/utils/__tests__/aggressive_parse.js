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
import expect from 'expect.js';
import sinon from 'sinon';
import * as aggressiveParse from '../aggressive_parse';

describe('aggressiveParse', () => {

  let object;
  let jsonFn;
  let result;

  beforeEach(() => {
    object = Object.freeze({
      foo: 'bar',
      nums: { two: 2, $three: 3 },
      another: { level: { $deep: 'inception' } },
      $no: 'wai'
    });
    jsonFn = sinon.stub().returns('{"foo":"bar","$foo":"bar"}');
  });

  describe('#toJson()', () => {
    it('returns serialized version of object', () => {
      result = aggressiveParse.toJson(object);
      result = JSON.parse(result);

      expect(_.get(result, 'foo')).to.equal(object.foo);
      expect(_.get(result, 'nums.two')).to.equal(object.nums.two);
      expect(_.has(result, 'another.level')).to.be(true);
    });

    it('does not include any properties that begin with $', () => {
      result = aggressiveParse.toJson(object);
      result = JSON.parse(result);

      expect(_.has(result, '$no')).to.be(false);
      expect(_.has(result, 'nums.$three')).to.be(false);
      expect(_.has(result, 'another.level.$deep')).to.be(false);
    });

    describe('with arity of 2', () => {
      beforeEach(() => {
        result = aggressiveParse.toJson(object, jsonFn);
        result = JSON.parse(result);
      });

      it('sends first argument to custom json function', () => {
        expect(jsonFn.calledWith(object)).to.be(true);
      });

      it('serializes the json returned by jsonFn', () => {
        expect(_.get(result, 'foo')).to.equal('bar');
      });

      it('still does not include any properties that begin with $', () => {
        expect(result).not.to.have.property('$foo');
      });
    });

    describe('with arity of 3', () => {
      beforeEach(() => {
        result = aggressiveParse.toJson({ foo: 'bar' }, undefined, 2);
      });

      it('formats the json string with the number of spaces given', () => {
        const formattedJson = JSON.stringify({ foo: 'bar' }, null, 2);
        expect(result).to.be(formattedJson);
      });
    });
  });

  describe('#replacer()', () => {
    it('returns undefined if key begins with $', () => {
      result = aggressiveParse.replacer('$foo', 'bar');
      expect(result).to.be(undefined);
    });
    it('returns value if key does not being with $', () => {
      result = aggressiveParse.replacer('foo', 'bar');
      expect(result).to.equal('bar');
    });
  });
});
