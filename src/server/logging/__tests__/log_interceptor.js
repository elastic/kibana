import expect from 'expect.js';

import { LogInterceptor } from '../log_interceptor';

function stubClientErrorEvent(errno) {
  const error = new Error();
  error.errno = errno;

  return {
    event: 'error',
    pid: 1234,
    timestamp: Date.now(),
    tags: ['connection', 'client', 'error'],
    data: error
  };
}

const stubEconnresetEvent = () => stubClientErrorEvent('ECONNRESET');
const stubEpipeEvent = () => stubClientErrorEvent('EPIPE');
const stubEcanceledEvent = () => stubClientErrorEvent('ECANCELED');

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

    it('does not match if the tags are not in order', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      event.tags = [...event.tags.slice(1), event.tags[0]];
      expect(interceptor.downgradeIfEconnreset(event)).to.be(null);
    });

    it('ignores non ECONNRESET events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent('not ECONNRESET');
      expect(interceptor.downgradeIfEconnreset(event)).to.be(null);
    });

    it('ignores if tags are wrong', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      event.tags = ['different', 'tags'];
      expect(interceptor.downgradeIfEconnreset(event)).to.be(null);
    });
  });

  describe('#downgradeIfEpipe()', () => {
    it('transforms EPIPE events', () => {
      const interceptor = new LogInterceptor();
      const event = stubEpipeEvent();
      assertDowngraded(interceptor.downgradeIfEpipe(event));
    });

    it('does not match if the tags are not in order', () => {
      const interceptor = new LogInterceptor();
      const event = stubEpipeEvent();
      event.tags = [...event.tags.slice(1), event.tags[0]];
      expect(interceptor.downgradeIfEpipe(event)).to.be(null);
    });

    it('ignores non EPIPE events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent('not EPIPE');
      expect(interceptor.downgradeIfEpipe(event)).to.be(null);
    });

    it('ignores if tags are wrong', () => {
      const interceptor = new LogInterceptor();
      const event = stubEpipeEvent();
      event.tags = ['different', 'tags'];
      expect(interceptor.downgradeIfEpipe(event)).to.be(null);
    });
  });

  describe('#downgradeIfEcanceled()', () => {
    it('transforms ECANCELED events', () => {
      const interceptor = new LogInterceptor();
      const event = stubEcanceledEvent();
      assertDowngraded(interceptor.downgradeIfEcanceled(event));
    });

    it('does not match if the tags are not in order', () => {
      const interceptor = new LogInterceptor();
      const event = stubEcanceledEvent();
      event.tags = [...event.tags.slice(1), event.tags[0]];
      expect(interceptor.downgradeIfEcanceled(event)).to.be(null);
    });

    it('ignores non ECANCELED events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent('not ECANCELED');
      expect(interceptor.downgradeIfEcanceled(event)).to.be(null);
    });

    it('ignores if tags are wrong', () => {
      const interceptor = new LogInterceptor();
      const event = stubEcanceledEvent();
      event.tags = ['different', 'tags'];
      expect(interceptor.downgradeIfEcanceled(event)).to.be(null);
    });
  });
});
