import EventEmitter from 'events';
import { assign, random } from 'lodash';
import sinon from 'sinon';
import cluster from 'cluster';
import { delay } from 'bluebird';

export default class MockClusterFork extends EventEmitter {
  constructor() {
    super();

    let dead = true;

    function wait() {
      return delay(random(10, 250));
    }

    assign(this, {
      process: {
        kill: sinon.spy(() => {
          (async () => {
            await wait();
            this.emit('disconnect');
            await wait();
            dead = true;
            this.emit('exit');
            cluster.emit('exit', this, this.exitCode || 0);
          })();
        }),
      },
      isDead: sinon.spy(() => dead),
      send: sinon.stub()
    });

    sinon.spy(this, 'on');
    sinon.spy(this, 'removeListener');
    sinon.spy(this, 'emit');

    (async () => {
      await wait();
      dead = false;
      this.emit('online');
    })();
  }
}
