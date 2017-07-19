import { Deprecations } from '../../../deprecation';
import expect from 'expect.js';
import index from '../index';
import { noop } from 'lodash';
import sinon from 'sinon';

describe('plugins/console', function () {
  describe('#deprecate()', function () {
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

    describe('proxyConfig', function () {
      it('leaves the proxyConfig settings', function () {
        const proxyConfigOne = {};
        const proxyConfigTwo = {};
        const settings = {
          proxyConfig: [proxyConfigOne, proxyConfigTwo]
        };

        transformDeprecations(settings);
        expect(settings.proxyConfig[0]).to.be(proxyConfigOne);
        expect(settings.proxyConfig[1]).to.be(proxyConfigTwo);
      });

      it('logs a warning when proxyConfig is specified', function () {
        const settings = {
          proxyConfig: []
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).to.be(true);
      });

      it(`doesn't log a warning when proxyConfig isn't specified`, function () {
        const settings = {};

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.called).to.be(false);
      });
    });
  });
});
