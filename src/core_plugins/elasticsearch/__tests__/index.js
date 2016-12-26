import { Deprecations } from '../../../deprecation';
import expect from 'expect.js';
import index from '../index';
import { noop } from 'lodash';
import sinon from 'sinon';

describe('plugins/elasticsearch', function () {
  describe('#deprecations()', function () {
    let transformDeprecations;

    before(function () {
      const Plugin = function (options) {
        this.deprecations = options.deprecations;
      };

      const plugin = index({ Plugin });

      const deprecations = plugin.deprecations(Deprecations);
      transformDeprecations = (settings, log = noop) => {
        deprecations.forEach(deprecation => deprecation(settings, log));
      };
    });

    context('verificationMode', function () {
      it('sets ssl.verificationMode to none when verify is false', function () {
        const settings = {
          ssl: {
            verify: false
          }
        };

        transformDeprecations(settings);
        expect(settings.ssl.verificationMode).to.be('none');
        expect(settings.ssl.verify).to.be(undefined);
      });

      it('should log when deprecating verify from false', function () {
        const settings = {
          ssl: {
            verify: false
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).to.be(true);
      });

      it('sets ssl.verificationMode to full when verify is true', function () {
        const settings = {
          ssl: {
            verify: true
          }
        };

        transformDeprecations(settings);
        expect(settings.ssl.verificationMode).to.be('full');
        expect(settings.ssl.verify).to.be(undefined);
      });

      it('should log when deprecating verify from true', function () {
        const settings = {
          ssl: {
            verify: true
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).to.be(true);
      });

      it(`shouldn't set verificationMode when verify isn't present`, function () {
        const settings = {
          ssl: {}
        };

        transformDeprecations(settings);
        expect(settings.ssl.verificationMode).to.be(undefined);
      });

      it(`shouldn't log when verify isn't present`, function () {
        const settings = {
          ssl: {}
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.called).to.be(false);
      });
    });
  });
});
