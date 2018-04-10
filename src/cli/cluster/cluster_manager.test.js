import sinon from 'sinon';
import cluster from 'cluster';
import { sample } from 'lodash';

import ClusterManager from './cluster_manager';
import Worker from './worker';

describe('CLI cluster manager', function () {
  const sandbox = sinon.sandbox.create();

  beforeEach(function () {
    sandbox.stub(cluster, 'fork', function () {
      return {
        process: {
          kill: sinon.stub(),
        },
        isDead: sinon.stub().returns(false),
        removeListener: sinon.stub(),
        on: sinon.stub(),
        send: sinon.stub()
      };
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('has two workers', function () {
    const manager = new ClusterManager({});

    expect(manager.workers).toHaveLength(2);
    for (const worker of manager.workers) expect(worker).toBeInstanceOf(Worker);

    expect(manager.optimizer).toBeInstanceOf(Worker);
    expect(manager.server).toBeInstanceOf(Worker);
  });

  it('delivers broadcast messages to other workers', function () {
    const manager = new ClusterManager({});

    for (const worker of manager.workers) {
      Worker.prototype.start.call(worker);// bypass the debounced start method
      worker.onOnline();
    }

    const football = {};
    const messenger = sample(manager.workers);

    messenger.emit('broadcast', football);
    for (const worker of manager.workers) {
      if (worker === messenger) {
        expect(worker.fork.send.callCount).toBe(0);
      } else {
        expect(worker.fork.send.firstCall.args[0]).toBe(football);
      }
    }
  });
});
