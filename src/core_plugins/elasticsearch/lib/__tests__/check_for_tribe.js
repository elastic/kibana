import expect from 'expect.js';
import { noop } from 'lodash';
import sinon from 'sinon';

import SetupError from '../setup_error';
import checkForTribe from '../check_for_tribe';

describe('plugins/elasticsearch checkForTribe', () => {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  const stubServer = () => ({
    log: noop,
    config: () => ({ get: noop })
  });

  const stubClient = (nodesInfoResp = { nodes: {} }) => ({
    nodes: {
      info: sandbox.spy(async () => await nodesInfoResp)
    }
  });

  it('fetches the local node stats of the node that the elasticsearch client is connected to', async () => {
    const client = stubClient();
    await checkForTribe(stubServer(), client);
    sinon.assert.calledOnce(client.nodes.info);
  });

  it('throws a SetupError when the node info contains tribe settings', async () => {
    const nodeInfo = {
      nodes: {
        __nodeId__: {
          settings: {
            tribe: {
              t1: {},
              t2: {},
            }
          }
        }
      }
    };

    try {
      await checkForTribe(stubServer(), stubClient(nodeInfo));
      throw new Error('checkForTribe() should have thrown');
    } catch (err) {
      expect(err).to.be.a(SetupError);
    }
  });
});
