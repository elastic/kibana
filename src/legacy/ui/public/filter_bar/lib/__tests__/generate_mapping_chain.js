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

import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { generateMappingChain } from '../generate_mapping_chain';

describe('Filter Bar Directive', function () {
  describe('generateMappingChain()', function () {
    beforeEach(ngMock.module('kibana'));


    it('should create a chaining function which calls the next function if the promise is rejected', function (done) {
      const filter = {};
      const mapping = sinon.stub();
      mapping.rejects(filter);
      const next = sinon.stub();
      next.resolves('good');
      const chain = generateMappingChain(mapping, next);
      chain(filter).then(function (result) {
        expect(result).to.be('good');
        sinon.assert.calledOnce(next);
        done();
      });
    });

    it('should create a chaining function which DOES NOT call the next function if the result is resolved', function (done) {
      const mapping = sinon.stub();
      mapping.resolves('good');
      const next = sinon.stub();
      next.resolves('bad');
      const chain = generateMappingChain(mapping, next);
      chain({}).then(function (result) {
        expect(result).to.be('good');
        sinon.assert.notCalled(next);
        done();
      });
    });

    it('should resolve result for the mapping function', function (done) {
      const mapping = sinon.stub();
      mapping.resolves({ key: 'test', value: 'example' });
      const next = sinon.stub();
      const chain = generateMappingChain(mapping, next);
      chain({}).then(function (result) {
        sinon.assert.notCalled(next);
        expect(result).to.eql({ key: 'test', value: 'example' });
        done();
      });
    });

    it('should call the mapping function with the argument to the chain', function (done) {
      const mapping = sinon.stub();
      mapping.resolves({ key: 'test', value: 'example' });
      const next = sinon.stub();
      const chain = generateMappingChain(mapping, next);
      chain({ test: 'example' }).then(function (result) {
        sinon.assert.calledOnce(mapping);
        expect(mapping.args[0][0]).to.eql({ test: 'example' });
        sinon.assert.notCalled(next);
        expect(result).to.eql({ key: 'test', value: 'example' });
        done();
      });
    });

    it('should resolve result for the next function', function (done) {
      const filter = {};
      const mapping = sinon.stub();
      mapping.rejects(filter);
      const next = sinon.stub();
      next.resolves({ key: 'test', value: 'example' });
      const chain = generateMappingChain(mapping, next);
      chain(filter).then(function (result) {
        sinon.assert.calledOnce(mapping);
        sinon.assert.calledOnce(next);
        expect(result).to.eql({ key: 'test', value: 'example' });
        done();
      });
    });

    it('should reject with an error if no functions match', function (done) {
      const filter = {};
      const mapping = sinon.stub();
      mapping.rejects(filter);
      const chain = generateMappingChain(mapping);
      chain(filter).catch(function (err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.be('No mappings have been found for filter.');
        done();
      });
    });

  });
});
