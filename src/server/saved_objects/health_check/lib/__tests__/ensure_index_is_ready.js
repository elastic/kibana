import sinon from 'sinon';
import Chance from 'chance';

import { ensureIndexIsReady } from '../ensure_index_is_ready';
import * as getIndexHealthNS from '../get_index_health';
import * as createIndexNS from '../create_index';

const { HEALTH } = getIndexHealthNS;
const chance = new Chance();

describe('savedObjects/healthCheck/ensureIndexIsReady', () => {
  const sandbox = sinon.sandbox.create();

  function setup() {
    const mappingsDsl = {};
    const checkDelay = 10;
    const callCluster = sinon.stub().throws();
    const index = chance.word();
    const status = {
      red: sinon.stub(),
      yellow: sinon.stub(),
      green: sinon.stub()
    };

    const getIndexHealth = sandbox.stub(getIndexHealthNS, 'getIndexHealth')
      .returns(HEALTH.READY);

    const createIndex = sandbox.stub(createIndexNS, 'createIndex')
      .returns({});

    async function run() {
      await ensureIndexIsReady({
        callCluster,
        index,
        checkDelay,
        status,
        mappingsDsl,
      });

      if (getIndexHealth.callCount) {
        sinon.assert.alwaysCalledWithExactly(getIndexHealth, { index, callCluster });
      }

      if (createIndex.callCount) {
        sinon.assert.alwaysCalledWithExactly(createIndex, { index, callCluster, mappingsDsl });
      }
    }

    return {
      run,
      status,
      getIndexHealth,
      createIndex,
    };
  }

  afterEach(() => sandbox.restore());

  it('creates the index if getIndexHealth says there is no index', async () => {
    const { createIndex, getIndexHealth, run } = setup();

    getIndexHealth
      .returns(HEALTH.NO_INDEX);

    await run();

    sinon.assert.calledOnce(getIndexHealth);
    sinon.assert.calledOnce(createIndex);
  });

  it('sets the status red if index is INITIALIZING, does not set it to green on ready', async () => {
    const { getIndexHealth, createIndex, status, run } = setup();

    getIndexHealth
      .onFirstCall().returns(HEALTH.INITIALIZING)
      .onSecondCall().returns(HEALTH.INITIALIZING)
      .onThirdCall().returns(HEALTH.READY);

    await run();

    sinon.assert.calledThrice(getIndexHealth);
    sinon.assert.notCalled(createIndex);

    sinon.assert.notCalled(status.green);
    sinon.assert.notCalled(status.yellow);

    sinon.assert.calledTwice(status.red);
    sinon.assert.alwaysCalledWithExactly(status.red, 'Elasticsearch is still initializing the kibana index.');
  });

  it('sets the cluster yellow if NO_INDEX, does not set it to green on ready', async () => {
    const { getIndexHealth, createIndex, status, run } = setup();

    getIndexHealth
      .returns(HEALTH.NO_INDEX);

    await run();

    sinon.assert.calledOnce(getIndexHealth);
    sinon.assert.calledOnce(createIndex);

    sinon.assert.notCalled(status.green);
    sinon.assert.calledOnce(status.yellow);
    sinon.assert.calledWithExactly(status.yellow, 'No existing Kibana index found');
    sinon.assert.notCalled(status.red);
  });
});
