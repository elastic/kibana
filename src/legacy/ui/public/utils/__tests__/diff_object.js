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

import expect from '@kbn/expect';
import _ from 'lodash';
import { applyDiff } from '../diff_object';

describe('ui/utils/diff_object', function() {
  it('should list the removed keys', function() {
    const target = { test: 'foo' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('removed');
    expect(results.removed).to.eql(['test']);
  });

  it('should list the changed keys', function() {
    const target = { foo: 'bar' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('changed');
    expect(results.changed).to.eql(['foo']);
  });

  it('should list the added keys', function() {
    const target = {};
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('added');
    expect(results.added).to.eql(['foo']);
  });

  it('should list all the keys that are change or removed', function() {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);
    expect(results).to.have.property('keys');
    expect(results.keys).to.eql(['foo', 'test']);
  });

  it('should ignore functions', function() {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', fn: _.noop };
    applyDiff(target, source);
    expect(target).to.not.have.property('fn');
  });

  it('should ignore underscores', function() {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', _private: 'foo' };
    applyDiff(target, source);
    expect(target).to.not.have.property('_private');
  });

  it('should ignore dollar signs', function() {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', $private: 'foo' };
    applyDiff(target, source);
    expect(target).to.not.have.property('$private');
  });

  it('should not list any changes for similar objects', function() {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'bar', test: 'foo', $private: 'foo' };
    const results = applyDiff(target, source);
    expect(results.changed).to.be.empty();
  });

  it('should only change keys that actually changed', function() {
    const obj = { message: 'foo' };
    const target = { obj: obj, message: 'foo' };
    const source = { obj: _.cloneDeep(obj), message: 'test' };
    applyDiff(target, source);
    expect(target.obj).to.be(obj);
  });
});
