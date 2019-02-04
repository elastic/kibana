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
import { getSearchDsl } from './search_dsl';
import * as queryParamsNS from './query_params';
import * as sortParamsNS from './sorting_params';

describe('getSearchDsl', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  describe('validation', () => {
    it('throws when type is not specified', () => {
      expect(() => {
        getSearchDsl({}, {}, {
          type: undefined,
          sortField: 'title'
        });
      }).toThrowError(/type must be specified/);
    });
    it('throws when sortOrder without sortField', () => {
      expect(() => {
        getSearchDsl({}, {}, {
          type: 'foo',
          sortOrder: 'desc'
        });
      }).toThrowError(/sortOrder requires a sortField/);
    });
  });

  describe('passes control', () => {
    it('passes (mappings, schema, namespace, type, search, searchFields, hasReference) to getQueryParams', () => {
      const spy = sandbox.spy(queryParamsNS, 'getQueryParams');
      const mappings = { type: { properties: {} } };
      const schema = { isNamespaceAgnostic: () => {} };
      const opts = {
        namespace: 'foo-namespace',
        type: 'foo',
        search: 'bar',
        searchFields: ['baz'],
        defaultSearchOperator: 'AND',
        hasReference: {
          type: 'bar',
          id: '1',
        },
      };

      getSearchDsl(mappings, schema, opts);
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(
        spy,
        mappings,
        schema,
        opts.namespace,
        opts.type,
        opts.search,
        opts.searchFields,
        opts.defaultSearchOperator,
        opts.hasReference,
      );
    });

    it('passes (mappings, type, sortField, sortOrder) to getSortingParams', () => {
      const spy = sandbox.stub(sortParamsNS, 'getSortingParams').returns({});
      const mappings = { type: { properties: {} } };
      const schema = { isNamespaceAgnostic: () => {} };
      const opts = {
        type: 'foo',
        sortField: 'bar',
        sortOrder: 'baz'
      };

      getSearchDsl(mappings, schema, opts);
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(
        spy,
        mappings,
        opts.type,
        opts.sortField,
        opts.sortOrder,
      );
    });

    it('returns combination of getQueryParams and getSortingParams', () => {
      sandbox.stub(queryParamsNS, 'getQueryParams').returns({ a: 'a' });
      sandbox.stub(sortParamsNS, 'getSortingParams').returns({ b: 'b' });
      expect(getSearchDsl(null, null, { type: 'foo' })).toEqual({ a: 'a', b: 'b' });
    });
  });
});
