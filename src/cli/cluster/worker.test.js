import sinon from 'sinon';
import cluster from 'cluster';
import { findIndex } from 'lodash';

import MockClusterFork from './_mock_cluster_fork';
import Worker from './worker';
import Log from '../log';

const workersToShutdown = [];

function assertListenerAdded(emitter, event) {
  sinon.assert.calledWith(emitter.on, event);
}

function assertListenerRemoved(emitter, event) {
  sinon.assert.calledWith(
    emitter.removeListener,
    event,
    emitter.on.args[findIndex(emitter.on.args, { 0: event })][1]
  );
}

function setup(opts = {}) {
  const worker = new Worker({
    log: new Log(false, true),
    ...opts,
    baseArgv: []
  });

  workersToShutdown.push(worker);
  return worker;
}

describe('CLI cluster manager', function () {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    sandbox.stub(cluster, 'fork').callsFake(() => new MockClusterFork());
  });

  afterEach(async function () {
    sandbox.restore();

    for (const worker of workersToShutdown) {
      await worker.shutdown();
    }
  });

  describe('#onChange', function () {
    describe('opts.watch = true', function () {
      it('restarts the fork', function () {
        const worker = setup({ watch: true });
        sinon.stub(worker, 'start');
        worker.onChange('/some/path');
        expect(worker.changes).toEqual(['/some/path']);
        sinon.assert.calledOnce(worker.start);
      });
    });

    describe('opts.watch = false', function () {
      it('does not restart the fork', function () {
        const worker = setup({ watch: false });
        sinon.stub(worker, 'start');
        worker.onChange('/some/path');
        expect(worker.changes).toEqual([]);
        sinon.assert.notCalled(worker.start);
      });
    });
  });

  describe('#shutdown', function () {
    describe('after starting()', function () {
      it('kills the worker and unbinds from message, online, and disconnect events', async function () {
        const worker = setup();
        await worker.start();
        expect(worker).toHaveProperty('online', true);
        const fork = worker.fork;
        sinon.assert.notCalled(fork.process.kill);
        assertListenerAdded(fork, 'message');
        assertListenerAdded(fork, 'online');
        assertListenerAdded(fork, 'disconnect');
        worker.shutdown();
        sinon.assert.calledOnce(fork.process.kill);
        assertListenerRemoved(fork, 'message');
        assertListenerRemoved(fork, 'online');
        assertListenerRemoved(fork, 'disconnect');
      });
    });

    describe('before being started', function () {
      it('does nothing', function () {
        const worker = setup();
        worker.shutdown();
      });
    });
  });

  describe('#parseIncomingMessage()', function () {
    describe('on a started worker', function () {
      it(`is bound to fork's message event`, async function () {
        const worker = setup();
        await worker.start();
        sinon.assert.calledWith(worker.fork.on, 'message');
      });
    });

    describe('do after', function () {
      it('ignores non-array messsages', function () {
        const worker = setup();
        worker.parseIncomingMessage('some string thing');
        worker.parseIncomingMessage(0);
        worker.parseIncomingMessage(null);
        worker.parseIncomingMessage(undefined);
        worker.parseIncomingMessage({ like: 'an object' });
        worker.parseIncomingMessage(/weird/);
      });

      it('calls #onMessage with message parts', function () {
        const worker = setup();
        const stub = sinon.stub(worker, 'onMessage');
        worker.parseIncomingMessage([10, 100, 1000, 10000]);
        sinon.assert.calledWith(stub, 10, 100, 1000, 10000);
      });
    });
  });

  describe('#onMessage', function () {
    describe('when sent WORKER_BROADCAST message', function () {
      it('emits the data to be broadcasted', function () {
        const worker = setup();
        const data = {};
        const stub = sinon.stub(worker, 'emit');
        worker.onMessage('WORKER_BROADCAST', data);
        sinon.assert.calledWithExactly(stub, 'broadcast', data);
      });
    });

    describe('when sent WORKER_LISTENING message', function () {
      it('sets the listening flag and emits the listening event', function () {
        const worker = setup();
        const stub = sinon.stub(worker, 'emit');
        expect(worker).toHaveProperty('listening', false);
        worker.onMessage('WORKER_LISTENING');
        expect(worker).toHaveProperty('listening', true);
        sinon.assert.calledWithExactly(stub, 'listening');
      });
    });

    describe('when passed an unkown message', function () {
      it('does nothing', function () {
        const worker = setup();
        worker.onMessage('asdlfkajsdfahsdfiohuasdofihsdoif');
        worker.onMessage({});
        worker.onMessage(23049283094);
      });
    });
  });

  describe('#start', function () {
    describe('when not started', function () {
      // TODO This test is flaky, see https://github.com/elastic/kibana/issues/15888
      it.skip('creates a fork and waits for it to come online', async function () {
        const worker = setup();

        sinon.spy(worker, 'on');

        await worker.start();

        sinon.assert.calledOnce(cluster.fork);
        sinon.assert.calledWith(worker.on, 'fork:online');
      });

      // TODO This test is flaky, see https://github.com/elastic/kibana/issues/15888
      it.skip('listens for cluster and process "exit" events', async function () {
        const worker = setup();

        sinon.spy(process, 'on');
        sinon.spy(cluster, 'on');

        await worker.start();

        sinon.assert.calledOnce(cluster.on);
        sinon.assert.calledWith(cluster.on, 'exit');
        sinon.assert.calledOnce(process.on);
        sinon.assert.calledWith(process.on, 'exit');
      });
    });

    describe('when already started', function () {
      it('calls shutdown and waits for the graceful shutdown to cause a restart', async function () {
        const worker = setup();
        await worker.start();
        sinon.spy(worker, 'shutdown');
        sinon.spy(worker, 'on');

        worker.start();
        sinon.assert.calledOnce(worker.shutdown);
        sinon.assert.calledWith(worker.on, 'online');
      });
    });
  });
});
