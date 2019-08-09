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
import ngMock from 'ng_mock';
import '../../private';

import { BaseObject } from '../base_object';

describe('Base Object', function () {
  beforeEach(ngMock.module('kibana'));

  it('should take an inital set of values', function () {
    const baseObject = new BaseObject({ message: 'test' });
    expect(baseObject).to.have.property('message', 'test');
  });

  it('should serialize attributes to RISON', function () {
    const baseObject = new BaseObject();
    baseObject.message = 'Testing... 1234';
    const rison = baseObject.toRISON();
    expect(rison).to.equal('(message:\'Testing... 1234\')');
  });

  it('should not serialize $$attributes to RISON', function () {
    const baseObject = new BaseObject();
    baseObject.$$attributes = { foo: 'bar' };
    baseObject.message = 'Testing... 1234';
    const rison = baseObject.toRISON();
    expect(rison).to.equal('(message:\'Testing... 1234\')');
  });

  it('should serialize attributes for JSON', function () {
    const baseObject = new BaseObject();
    baseObject.message = 'Testing... 1234';
    baseObject._private = 'foo';
    baseObject.$private = 'stuff';
    const json = JSON.stringify(baseObject);
    expect(json).to.equal('{"message":"Testing... 1234"}');
  });
});
