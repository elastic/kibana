import expect from 'expect.js';
import { shuffle } from 'lodash';

import { LogInterceptor } from '../log_interceptor';

function stubEconnresetEvent() {
  const error = new Error();
  error.errno = 'ECONNRESET';

  return {
    event: 'error',
    pid: 1234,
    timestamp: Date.now(),
    tags: ['error', 'client', 'connection'],
    data: error
  };
}

function assertDowngraded(transformed) {
  expect(!!transformed).to.be(true);
  expect(transformed).to.have.property('event', 'log');
  expect(transformed).to.have.property('tags');
  expect(transformed.tags).to.not.contain('error');
}

describe('server logging LogInterceptor', () => {
  describe('#downgradeIfEconnreset()', () => {
    it('transforms ECONNRESET events', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      assertDowngraded(interceptor.downgradeIfEconnreset(event));
    });

    it('matches even when the tags are out of order', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      event.tags = shuffle(event.tags.slice(0));
      assertDowngraded(interceptor.downgradeIfEconnreset(event));
    });

    it('ignores non ECONNRESET events', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      event.data.errno = 'not ECONNRESET';
      expect(interceptor.downgradeIfEconnreset(event)).to.be(null);
    });

    it('ignores if tags are wrong', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      event.tags = ['different', 'tags'];
      expect(interceptor.downgradeIfEconnreset(event)).to.be(null);
    });
  });
});
