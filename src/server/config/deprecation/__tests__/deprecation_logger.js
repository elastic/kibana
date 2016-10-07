import expect from 'expect.js';
import { DeprecationLogger } from '../deprecation_logger';
import sinon from 'sinon';

let logger;

beforeEach(function () {
  logger = new DeprecationLogger();
});

describe('DeprecationLogger', function () {
  it('log throws error by default', function () {
    expect(logger.log).to.throwException();
  });

  it('throws error if set isn\'t called with a function', function () {
    [{}, 1, 'something', [], true, null, undefined].forEach(function (value) {
      expect(logger.log).withArgs(value).to.throwException();
    });
  });

  it('allows custom logger to be set', function () {
    const log = sinon.spy();
    logger.set(log);
    logger.log('Deprecation warning');
    expect(log.calledOnce).to.be(true);
  });
});
