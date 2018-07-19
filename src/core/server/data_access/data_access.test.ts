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
// TODO: once typescript definition created for elasticsearch
// use this NotFound error
// import elasticsearch from 'elasticsearch';
// import { NotFound } from elasticsearch.errors;
import { decorateEsError, trimIdPrefix, errors } from './lib';
const errorsMock = {
  isNotFoundError: jest.fn(() => true),
  createEsAutoCreateIndexError: jest.fn(() => {
    throw new Error();
  }),
};
jest.mock('../lib', () => ({
  decorateEsError: jest.fn(e => e),
  errors: errorsMock,
  trimIdPrefix: jest.fn(id => id),
}));

import { DataAccess } from './data_access';

describe('kibana objects data access', () => {
  const mockFields = { updated_at: '2018-07-17T09:36:14.791Z' };
  const mockCallCluster = jest.fn(() => ({
    _id: 'foo',
    _version: 'bar',
  }));

  describe('#constructor', () => {
    test('creates an instance without onBeforeWrite', () => {
      const options = {
        index: '.kibana',
        mappings: {
          foo: {},
        },
        callCluster: () => {},
      };
      const dal = new DataAccess(options);
      expect(dal).toMatchSnapshot();
    });

    test('creates an instance with onBeforeWrite', () => {
      const options = {
        index: '.foo',
        mappings: {
          foo: {},
        },
        onBeforeWrite: () => {},
        callCluster: () => {},
      };
      const dal = new DataAccess(options);
      expect(dal).toMatchSnapshot();
    });
  });

  describe('#create method', () => {
    test('creates document with ES index action, generating id', async () => {
      const options = {
        index: '.foo',
        mappings: {
          foo: {},
        },
        callCluster: mockCallCluster,
      };
      const dal = new DataAccess(options);
      const rtn = await dal.create('foo', { attr: 'bar' });
      const withMock = {
        ...rtn,
        ...mockFields,
      };
      expect(withMock).toMatchSnapshot();
      expect(options.callCluster.mock.calls[0][0]).toEqual('index');
      expect(options.callCluster.mock.calls[0][1]).toMatchObject({
        id: /foo:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      });
    });

    test('creates document with ES create action, setting id', async () => {
      const options = {
        index: '.foo',
        mappings: {
          foo: {},
        },
        callCluster: mockCallCluster,
      };
      const dal = new DataAccess(options);
      const rtn = await dal.create('foo', { attr: 'bar' }, { id: 'baz' });
      const withMock = {
        ...rtn,
        ...mockFields,
      };
      expect(withMock).toMatchSnapshot();
      expect(options.callCluster.mock.calls[1][0]).toEqual('create');
      expect(options.callCluster.mock.calls[1][1]).toMatchObject({
        id: 'foo:baz',
      });
    });

    test('throws when index not created', async () => {
      expect.assertions(2);

      const options = {
        index: '.foo',
        mappings: {
          foo: {},
        },
        callCluster: () => {
          throw new Error('mock error');
        },
      };

      const dal = new DataAccess(options);
      try {
        await dal.create('foo');
      } catch (err) {
        expect(err).toBeDefined();
        expect(errorsMock.createEsAutoCreateIndexError).toBeCalled();
      }
    });
  });

  describe.only('#bulkCreate method', () => {
    const sandbox = sinon.createSandbox();
    let callCluster: any;

    beforeEach(() => {
      callCluster = sandbox.stub();
    });

    test('creates documents', async () => {
      callCluster.returns({ items: [] });

      const options = {
        index: '.foo',
        mappings: {
          foo: {},
        },
        callCluster,
      };

      const dal = new DataAccess(options);
      const rtn = await dal.bulkCreate([
        {
          type: 'foo',
          id: 'bar',
          attributes: { attr: 'baz' },
        },
        {
          type: 'foo2',
          id: 'bar2',
          attributes: { attr: 'baz2' },
        },
      ]);
      const withMock = rtn.reduce(
        (acc, obj) => [...acc, { ...obj, ...mockFields }],
        []
      );
      expect(withMock).toMatchSnapshot();
      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'bulk');
    });

    test('overwrites documents');
  });

  describe('#delete method', () => {
    test('deletes by id');
    test('throws not found');
  });

  describe('#find method', () => {});

  describe('#bulkGet method', () => {});

  describe('#get method', () => {});

  describe('#update method', () => {});
});
