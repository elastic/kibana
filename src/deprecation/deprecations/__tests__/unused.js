import expect from 'expect.js';
import sinon from 'sinon';
import { unused } from '../unused';

describe('deprecation/deprecations', function () {
  describe('unused', function () {
    it('should remove unused setting', function () {
      const settings = {
        old: true
      };

      unused('old')(settings);
      expect(settings.old).to.be(undefined);
    });

    it(`shouldn't remove used setting`, function () {
      const value = 'value';
      const settings = {
        new: value
      };

      unused('old')(settings);
      expect(settings.new).to.be(value);
    });

    it('should remove unused setting, even when null', function () {
      const settings = {
        old: null
      };

      unused('old')(settings);
      expect(settings.old).to.be(undefined);
    });

    it('should log when removing unused setting', function () {
      const settings = {
        old: true
      };

      const log = sinon.spy();
      unused('old')(settings, log);

      expect(log.calledOnce).to.be(true);
      expect(log.args[0][0]).to.match(/old.+deprecated/);
    });

    it(`shouldn't log when no setting is unused`, function () {
      const settings = {
        new: true
      };

      const log = sinon.spy();
      unused('old')(settings, log);
      expect(log.called).to.be(false);
    });
  });
});
