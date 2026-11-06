/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import sinon from 'sinon';
import { errors as esErrors } from '@elastic/elasticsearch';

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

    it('sets ignore_unavailable and allow_no_indices params', async () => {
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

    const createNoSuchRemoteClusterError = (cluster) =>
      new esErrors.ResponseError({
        statusCode: 404,
        body: {
          error: {
            root_cause: [
              {
                type: 'no_such_remote_cluster_exception',
                reason: `no such remote cluster: [${cluster}]`,
              },
            ],
            type: 'no_such_remote_cluster_exception',
            reason: `no such remote cluster: [${cluster}]`,
          },
          status: 404,
        },
      });

    it('calls fieldCaps() via callCluster', async () => {
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi({ callCluster });
      sinon.assert.calledOnce(fieldCaps);
    });

    it('passes indices directly to es api', async () => {
      const indices = ['indexA', 'indexB'];
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi({ callCluster, indices });
      sinon.assert.calledOnce(fieldCaps);
      expect(fieldCaps.args[0][0].index).toBe(indices);
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
      const resp = await callFieldCapsApi({ callCluster });
      sinon.assert.calledOnce(fieldCaps);
      expect(resp).toBe(football);
    });

    it('sets ignore_unavailable, allow_no_indices, and fields params', async () => {
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi({ callCluster });
      sinon.assert.calledOnce(fieldCaps);

      const passedOpts = fieldCaps.args[0][0];
      expect(passedOpts).toHaveProperty('fields', ['*']);
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
        await callFieldCapsApi({ callCluster, indices });
        throw new Error('expected callFieldCapsApi() to throw');
      } catch (error) {
        expect(error).toBe(convertedError);
        sinon.assert.calledOnce(convertEsError);
        expect(convertEsError.args[0][0]).toBe(indices);
        expect(convertEsError.args[0][1]).toBe(esError);
      }
    });

    it('retries without the patterns targeting a non-existing remote cluster', async () => {
      const football = {};
      const fieldCaps = sinon.stub();
      fieldCaps.onFirstCall().rejects(createNoSuchRemoteClusterError('non_existing_cluster'));
      fieldCaps.onSecondCall().resolves(football);
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };

      const resp = await callFieldCapsApi({
        callCluster,
        indices: 'basic_index,non_existing_cluster:logs-*,-non_existing_cluster:logs-excluded',
      });

      sinon.assert.calledTwice(fieldCaps);
      expect(fieldCaps.secondCall.args[0].index).toEqual(['basic_index']);
      expect(resp).toBe(football);
    });

    it('returns an empty response when only a non-existing remote cluster is targeted and allow_no_indices is true', async () => {
      const fieldCaps = sinon
        .stub()
        .rejects(createNoSuchRemoteClusterError('non_existing_cluster'));
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };

      const resp = await callFieldCapsApi({
        callCluster,
        indices: ['non_existing_cluster:logs-*'],
        fieldCapsOptions: { allow_no_indices: true },
      });

      sinon.assert.calledOnce(fieldCaps);
      expect(resp).toEqual({ body: { indices: [], fields: {} } });
    });

    it('throws when only a non-existing remote cluster is targeted and allow_no_indices is false', async () => {
      const fieldCaps = sinon
        .stub()
        .rejects(createNoSuchRemoteClusterError('non_existing_cluster'));
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };

      await expect(
        callFieldCapsApi({ callCluster, indices: ['non_existing_cluster:logs-*'] })
      ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 404 } });
      sinon.assert.calledOnce(fieldCaps);
    });

    it('passes projectRouting to es api when provided', async () => {
      const projectRouting = 'test-project-id';
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi({ callCluster, projectRouting });
      sinon.assert.calledOnce(fieldCaps);

      const passedOpts = fieldCaps.args[0][0];
      expect(passedOpts).toHaveProperty('project_routing', projectRouting);
    });

    it('does not include project_routing when not provided', async () => {
      const fieldCaps = sinon.stub();
      const callCluster = {
        indices: {
          getAlias: sinon.stub(),
        },
        fieldCaps,
      };
      await callFieldCapsApi({ callCluster });
      sinon.assert.calledOnce(fieldCaps);

      const passedOpts = fieldCaps.args[0][0];
      expect(passedOpts).not.toHaveProperty('project_routing');
    });
  });
});
