import sinon from 'sinon';
import expect from 'expect.js';

import { getSupportedFeatures } from '../get_supported_features';


describe('getSupportedFeatures', () => {
  describe('field_stats_api feature', () => {
    it('is supported when all node version are below 6.0.0', async () => {
      const callWithRequest = sinon.stub().returns({
        nodes: {
          node1: {
            name: 'node1',
            version: '5.6.0',
          },
          node2: {
            name: 'node2',
            version: '5.5.0',
          },
        },
      });

      const featureFlags = await getSupportedFeatures(callWithRequest);

      expect(featureFlags.field_stats_api).to.eql({
        reasons: [],
        supported: true,
      });
    });

    it('is not supported when one node version is at least 6.0.0', async () => {
      const callWithRequest = sinon.stub().returns({
        nodes: {
          node1: {
            name: 'node1',
            version: '5.6.0',
          },
          node2: {
            name: 'node2',
            version: '6.0.0',
          },
        },
      });

      const featureFlags = await getSupportedFeatures(callWithRequest);

      expect(featureFlags.field_stats_api).to.eql({
        reasons: ['A node in the cluster does not support the api: node2'],
        supported: false,
      });
    });
  });
});
