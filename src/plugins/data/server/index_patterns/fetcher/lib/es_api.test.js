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

import { convertEsError } from './errors';
import * as convertEsErrorNS from './errors';

import { callIndexAliasApi, callFieldCapsApi } from './es_api';

describe('server/index_patterns/service/lib/es_api', () => {
  describe('#callIndexAliasApi()', () => {
    let sandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it('calls indices.getAlias() via callCluster', async () => {
      const getAlias = sinon.stub();
      const callCluster = {
        indices: {
          getAlias,
        },
        fieldCaps: sinon.stub(),
      };

      await callIndexAliasApi(callCluster);
      sinon.assert.calledOnce(getAlias);
    });

    it('passes indices directly to es api', async () => {
      const football = {};
      const getAlias = sinon.stub();
      const callCluster = {
        indices: {
          getAlias,
        },
        fieldCaps: sinon.stub(),
      };
      await callIndexAliasApi(callCluster, football);
      sinon.assert.calledOnce(getAlias);
      expect(getAlias.args[0][0].index).toBe(football);
    });

    it('returns the es response directly', async () => {
      const football = {};
      const getAlias = sinon.stub().returns(football);
      const callCluster = {
        indices: {
          getAlias,
        },
        fieldCaps: sinon.stub(),
      };
      const resp = await callIndexAliasApi(callCluster);
      sinon.assert.calledOnce(getAlias);
      expect(resp).toBe(football);
    });

    it('sets ignoreUnavailable and allowNoIndices params', async () => {
      const getAlias = sinon.stub();
      const callCluster = {
        indices: {
          getAlias,
        },
        fieldCaps: sinon.stub(),
      };
      await callIndexAliasApi(callCluster);
      sinon.assert.calledOnce(getAlias);

      const passedOpts = getAlias.args[0][0];
      expect(passedOpts).toHaveProperty('ignore_unavailable', true);
      expect(passedOpts).toHaveProperty('allow_no_indices', false);
    });

    it('handles errors with convertEsError()', async () => {
      const indices = [];
      const esError = new Error('esError');
      const convertedError = new Error('convertedError');

      sandbox.stub(convertEsErrorNS, 'convertEsError').throws(convertedError);
      const getAlias = sinon.stub(async () => {
        throw esError;
      });
      const callCluster = {
        indices: {
          getAlias,
        },
        fieldCaps: sinon.stub(),
      };
      try {
        await callIndexAliasApi(callCluster, indices);
        throw new Error('expected callIndexAliasApi() to throw');
      } catch (error) {
        expect(error).toBe(convertedError);
        sinon.assert.calledOnce(convertEsError);
        expect(convertEsError.args[0][0]).toBe(indices);
        expect(convertEsError.args[0][1]).toBe(esError);
      }
    });
  });

  describe('#callFieldCapsApi()', () => {
    let sandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it('calls fieldCaps() via callCluster', async () => {
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi(callCluster);
      sinon.assert.calledOnce(fieldCaps);
    });

    it('passes indices directly to es api', async () => {
      const football = {};
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi(callCluster, football);
      sinon.assert.calledOnce(fieldCaps);
      expect(fieldCaps.args[0][0].index).toBe(football);
    });

    it('returns the es response directly', async () => {
      const football = {};
      const fieldCaps = sinon.stub().returns(football);
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      const resp = await callFieldCapsApi(callCluster);
      sinon.assert.calledOnce(fieldCaps);
      expect(resp).toBe(football);
    });

    it('sets ignoreUnavailable, allowNoIndices, and fields params', async () => {
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi(callCluster);
      sinon.assert.calledOnce(fieldCaps);

      const passedOpts = fieldCaps.args[0][0];
      expect(passedOpts).toHaveProperty('fields', '*');
      expect(passedOpts).toHaveProperty('ignore_unavailable', true);
      expect(passedOpts).toHaveProperty('allow_no_indices', false);
    });

    it('handles errors with convertEsError()', async () => {
      const indices = [];
      const esError = new Error('esError');
      const convertedError = new Error('convertedError');

      sandbox.stub(convertEsErrorNS, 'convertEsError').throws(convertedError);
      const fieldCaps = sinon.spy(async () => {
        throw esError;
      });
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      try {
        await callFieldCapsApi(callCluster, indices);
        throw new Error('expected callFieldCapsApi() to throw');
      } catch (error) {
        expect(error).toBe(convertedError);
        sinon.assert.calledOnce(convertEsError);
        expect(convertEsError.args[0][0]).toBe(indices);
        expect(convertEsError.args[0][1]).toBe(esError);
      }
    });
  });
});
