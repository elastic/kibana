import expect from 'expect.js';
import Chance from 'chance';
import { createLogLevelFlags } from '../log_levels';

const chance = new Chance();

describe('createLogLevelFlags()', () => {
  context('logLevel=silent', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('silent')).to.eql({
        silent: true,
        error: false,
        info: false,
        debug: false,
      });
    });
  });

  context('logLevel=error', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('error')).to.eql({
        silent: true,
        error: true,
        info: false,
        debug: false,
      });
    });
  });

  context('logLevel=info', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('info')).to.eql({
        silent: true,
        error: true,
        info: true,
        debug: false,
      });
    });
  });

  context('logLevel=debug', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('debug')).to.eql({
        silent: true,
        error: true,
        info: true,
        debug: true,
      });
    });
  });

  context('invalid logLevel', () => {
    it('throws error', () => {
      // avoid the impossiblity that a valid level is generated
      // by specifying a long length
      const level = chance.word({ length: 10 });

      expect(() => createLogLevelFlags(level))
        .to.throwError(level);
    });
  });
});
