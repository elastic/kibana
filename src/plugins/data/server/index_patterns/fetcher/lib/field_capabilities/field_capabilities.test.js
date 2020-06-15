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

/* eslint import/no-duplicates: 0 */
import sinon from 'sinon';
import { identity, shuffle, sortBy } from 'lodash';

import { getFieldCapabilities } from '../field_capabilities';

import { callFieldCapsApi } from '../es_api';
import * as callFieldCapsApiNS from '../es_api';

import { readFieldCapsResponse } from './field_caps_response';
import * as readFieldCapsResponseNS from './field_caps_response';

import { mergeOverrides } from './overrides';
import * as mergeOverridesNS from './overrides';

describe('index_patterns/field_capabilities/field_capabilities', () => {
  let sandbox;
  beforeEach(() => (sandbox = sinon.createSandbox()));
  afterEach(() => sandbox.restore());

  const footballs = [
    { 'could be aything': true },
    { 'used to verify that values are directly passed through': true },
  ];

  // assert that the stub was called with the exact `args`, using === matching
  const calledWithExactly = (stub, args, matcher = sinon.match.same) => {
    sinon.assert.calledWithExactly(stub, ...args.map((arg) => matcher(arg)));
  };

  const stubDeps = (options = {}) => {
    const { esResponse = {}, fieldsFromFieldCaps = [], mergeOverrides = identity } = options;

    sandbox.stub(callFieldCapsApiNS, 'callFieldCapsApi').callsFake(async () => esResponse);
    sandbox.stub(readFieldCapsResponseNS, 'readFieldCapsResponse').returns(fieldsFromFieldCaps);
    sandbox.stub(mergeOverridesNS, 'mergeOverrides').callsFake(mergeOverrides);
  };

  describe('calls `callFieldCapsApi()`', () => {
    it('passes exact `callCluster` and `indices` args through', async () => {
      stubDeps();

      await getFieldCapabilities(footballs[0], footballs[1]);
      sinon.assert.calledOnce(callFieldCapsApi);
      calledWithExactly(callFieldCapsApi, [footballs[0], footballs[1]]);
    });
  });

  describe('calls `readFieldCapsResponse`', () => {
    it('passes exact es response', async () => {
      stubDeps({
        esResponse: footballs[0],
      });

      await getFieldCapabilities();
      sinon.assert.calledOnce(readFieldCapsResponse);
      calledWithExactly(readFieldCapsResponse, [footballs[0]]);
    });
  });

  describe('response order', () => {
    it('always returns fields in alphabetical order', async () => {
      const letters = 'ambcdfjopngihkel'.split('');
      const sortedLetters = sortBy(letters);

      stubDeps({
        fieldsFromFieldCaps: shuffle(letters.map((name) => ({ name }))),
      });

      const fieldNames = (await getFieldCapabilities()).map((field) => field.name);
      expect(fieldNames).toEqual(sortedLetters);
    });
  });

  describe('metaFields', () => {
    it('ensures there is a response for each metaField', async () => {
      stubDeps({
        fieldsFromFieldCaps: [{ name: 'foo' }, { name: 'bar' }],
      });

      const resp = await getFieldCapabilities(undefined, undefined, ['meta1', 'meta2']);
      expect(resp).toHaveLength(4);
      expect(resp.map((field) => field.name)).toEqual(['bar', 'foo', 'meta1', 'meta2']);
    });
  });

  describe('defaults', () => {
    const properties = ['name', 'type', 'searchable', 'aggregatable', 'readFromDocValues'];

    const createField = () => ({
      name: footballs[0],
      type: footballs[0],
      searchable: footballs[0],
      aggregatable: footballs[0],
      readFromDocValues: footballs[0],
    });

    describe('ensures that every field has property:', () => {
      properties.forEach((property) => {
        it(property, async () => {
          const field = createField();
          delete field[property];

          stubDeps({
            fieldsFromFieldCaps: [field],
          });

          const resp = await getFieldCapabilities();
          expect(resp).toHaveLength(1);
          expect(resp[0]).toHaveProperty(property);
          expect(resp[0][property]).not.toBe(footballs[0]);

          // ensure field object was not mutated
          expect(field).not.toHaveProperty(property);
          Object.keys(field).forEach((key) => {
            // ensure response field has original values from field
            expect(resp[0][key]).toBe(footballs[0]);
          });
        });
      });
    });
  });

  describe('overrides', () => {
    it('passes each field to `mergeOverrides()`', async () => {
      const fieldsFromFieldCaps = [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }];

      stubDeps({ fieldsFromFieldCaps });

      sinon.assert.notCalled(mergeOverrides);
      await getFieldCapabilities();
      sinon.assert.calledThrice(mergeOverrides);

      expect(mergeOverrides.args[0][0]).toHaveProperty('name', 'foo');
      expect(mergeOverrides.args[1][0]).toHaveProperty('name', 'bar');
      expect(mergeOverrides.args[2][0]).toHaveProperty('name', 'baz');
    });

    it('replaces field with return value', async () => {
      const fieldsFromFieldCaps = [
        { name: 'foo', bar: 1 },
        { name: 'baz', box: 2 },
      ];

      stubDeps({
        fieldsFromFieldCaps,
        mergeOverrides() {
          return { notFieldAnymore: 1 };
        },
      });

      expect(await getFieldCapabilities()).toEqual([
        { notFieldAnymore: 1 },
        { notFieldAnymore: 1 },
      ]);
    });
  });
});
