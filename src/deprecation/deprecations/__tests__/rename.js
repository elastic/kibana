import expect from 'expect.js';
import { rename } from '../rename';
import sinon from 'sinon';

describe('deprecation/deprecations', function () {
  describe('rename', function () {
    it('should rename simple property', function () {
      const value = 'value';
      const settings = {
        before: value
      };

      rename('before', 'after')(settings);
      expect(settings.before).to.be(undefined);
      expect(settings.after).to.be(value);
    });

    it ('should rename nested property', function () {
      const value = 'value';
      const settings = {
        someObject: {
          before: value
        }
      };

      rename('someObject.before', 'someObject.after')(settings);
      expect(settings.someObject.before).to.be(undefined);
      expect(settings.someObject.after).to.be(value);
    });

    it ('should rename property, even when the value is null', function () {
      const value = null;
      const settings = {
        before: value
      };

      rename('before', 'after')(settings);
      expect(settings.before).to.be(undefined);
      expect(settings.after).to.be(null);
    });

    it (`shouldn't log when a rename doesn't occur`, function () {
      const settings = {
        exists: true
      };

      const log = sinon.spy();
      rename('doesntExist', 'alsoDoesntExist')(settings, log);
      expect(log.called).to.be(false);
    });

    it ('should log when a rename does occur', function () {
      const settings = {
        exists: true
      };

      const log = sinon.spy();
      rename('exists', 'alsoExists')(settings, log);

      expect(log.calledOnce).to.be(true);
      expect(log.args[0][0]).to.match(/exists.+deprecated/);
    });
  });
});
