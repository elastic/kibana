import { Deprecations } from '../../../deprecation';
import expect from 'expect.js';
import index from '../index';
import { compact, noop, set } from 'lodash';
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

    [null, 'tribe'].forEach((basePath) => {
      const getKey = (path) => {
        return compact([basePath, path]).join('.');
      };

      describe(getKey('ssl.verificationMode'), function () {
        let settings;
        let sslSettings;

        beforeEach(function () {
          settings = {};
          sslSettings = {};
          set(settings, getKey('ssl'), sslSettings);
        });

        it(`sets verificationMode to none when verify is false`, function () {
          sslSettings.verify = false;

          transformDeprecations(settings);
          expect(sslSettings.verificationMode).to.be('none');
          expect(sslSettings.verify).to.be(undefined);
        });

        it('should log when deprecating verify from false', function () {
          sslSettings.verify = false;

          const log = sinon.spy();
          transformDeprecations(settings, log);
          expect(log.calledOnce).to.be(true);
        });

        it('sets verificationMode to full when verify is true', function () {
          sslSettings.verify = true;

          transformDeprecations(settings);
          expect(sslSettings.verificationMode).to.be('full');
          expect(sslSettings.verify).to.be(undefined);
        });

        it('should log when deprecating verify from true', function () {
          sslSettings.verify = true;

          const log = sinon.spy();
          transformDeprecations(settings, log);
          expect(log.calledOnce).to.be(true);
        });

        it(`shouldn't set verificationMode when verify isn't present`, function () {
          transformDeprecations(settings);
          expect(sslSettings.verificationMode).to.be(undefined);
        });

        it(`shouldn't log when verify isn't present`, function () {
          const log = sinon.spy();
          transformDeprecations(settings, log);
          expect(log.called).to.be(false);
        });
      });
    });
  });
});
