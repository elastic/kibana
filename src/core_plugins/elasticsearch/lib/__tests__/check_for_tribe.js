import expect from 'expect.js';
import { noop } from 'lodash';
import sinon from 'sinon';

import checkForTribe from '../check_for_tribe';

describe('plugins/elasticsearch checkForTribe', () => {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  const stubCallAsKibanaUser = (nodesInfoResp = { nodes: {} }) => {
    return sinon.stub().withArgs(
      'nodes.info',
      sinon.match.any
    ).returns(
      Promise.resolve(nodesInfoResp)
    );
  };


  it('fetches the local node stats of the node that the elasticsearch client is connected to', async () => {
    const callAsKibanaUser = stubCallAsKibanaUser();
    await checkForTribe(callAsKibanaUser);
    sinon.assert.calledOnce(callAsKibanaUser);
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
      await checkForTribe(stubCallAsKibanaUser(nodeInfo));
      throw new Error('checkForTribe() should have thrown');
    } catch (err) {
      expect(err).to.be.a(Error);
    }
  });
});
