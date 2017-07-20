import sinon from 'sinon';
import expect from 'expect.js';

import { convertEsError } from '../errors';
import * as convertEsErrorNS from '../errors';

import { callIndexAliasApi, callFieldCapsApi } from '../es_api';

describe('server/index_patterns/service/lib/es_api', () => {
  describe('#callIndexAliasApi()', () => {
    let sandbox;
    beforeEach(() => sandbox = sinon.sandbox.create());
    afterEach(() => sandbox.restore());

    it('calls indices.getAlias() via callCluster', async () => {
      const callCluster = sinon.stub();
      await callIndexAliasApi(callCluster);
      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.getAlias');
    });

    it('passes indices directly to es api', async () => {
      const football = {};
      const callCluster = sinon.stub();
      await callIndexAliasApi(callCluster, football);
      sinon.assert.calledOnce(callCluster);
      expect(callCluster.args[0][1].index).to.be(football);
    });

    it('returns the es response directly', async () => {
      const football = {};
      const callCluster = sinon.stub().returns(football);
      const resp = await callIndexAliasApi(callCluster);
      sinon.assert.calledOnce(callCluster);
      expect(resp).to.be(football);
    });

    it('sets ignoreUnavailable and allowNoIndices params', async () => {
      const callCluster = sinon.stub();
      await callIndexAliasApi(callCluster);
      sinon.assert.calledOnce(callCluster);

      const passedOpts = callCluster.args[0][1];
      expect(passedOpts).to.have.property('ignoreUnavailable', true);
      expect(passedOpts).to.have.property('allowNoIndices', false);
    });

    it('handles errors with convertEsError()', async () => {
      const indices = [];
      const esError = new Error('esError');
      const convertedError = new Error('convertedError');

      sandbox.stub(convertEsErrorNS, 'convertEsError', () => { throw convertedError; });
      const callCluster = sinon.spy(async () => { throw esError; });
      try {
        await callIndexAliasApi(callCluster, indices);
        throw new Error('expected callIndexAliasApi() to throw');
      } catch (error) {
        expect(error).to.be(convertedError);
        sinon.assert.calledOnce(convertEsError);
        expect(convertEsError.args[0][0]).to.be(indices);
        expect(convertEsError.args[0][1]).to.be(esError);
      }
    });
  });

  describe('#callFieldCapsApi()', () => {
    let sandbox;
    beforeEach(() => sandbox = sinon.sandbox.create());
    afterEach(() => sandbox.restore());

    it('calls fieldCaps() via callCluster', async () => {
      const callCluster = sinon.stub();
      await callFieldCapsApi(callCluster);
      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'fieldCaps');
    });

    it('passes indices directly to es api', async () => {
      const football = {};
      const callCluster = sinon.stub();
      await callFieldCapsApi(callCluster, football);
      sinon.assert.calledOnce(callCluster);
      expect(callCluster.args[0][1].index).to.be(football);
    });

    it('returns the es response directly', async () => {
      const football = {};
      const callCluster = sinon.stub().returns(football);
      const resp = await callFieldCapsApi(callCluster);
      sinon.assert.calledOnce(callCluster);
      expect(resp).to.be(football);
    });

    it('sets ignoreUnavailable, allowNoIndices, and fields params', async () => {
      const callCluster = sinon.stub();
      await callFieldCapsApi(callCluster);
      sinon.assert.calledOnce(callCluster);

      const passedOpts = callCluster.args[0][1];
      expect(passedOpts).to.have.property('fields', '*');
      expect(passedOpts).to.have.property('ignoreUnavailable', true);
      expect(passedOpts).to.have.property('allowNoIndices', false);
    });

    it('handles errors with convertEsError()', async () => {
      const indices = [];
      const esError = new Error('esError');
      const convertedError = new Error('convertedError');

      sandbox.stub(convertEsErrorNS, 'convertEsError', () => { throw convertedError; });
      const callCluster = sinon.spy(async () => { throw esError; });
      try {
        await callFieldCapsApi(callCluster, indices);
        throw new Error('expected callFieldCapsApi() to throw');
      } catch (error) {
        expect(error).to.be(convertedError);
        sinon.assert.calledOnce(convertEsError);
        expect(convertEsError.args[0][0]).to.be(indices);
        expect(convertEsError.args[0][1]).to.be(esError);
      }
    });
  });
});
