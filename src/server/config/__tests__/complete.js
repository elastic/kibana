import completeMixin from '../complete';
import expect from 'expect.js';
import { noop } from 'lodash';
import sinon from 'sinon';

/* eslint-disable import/no-duplicates */
import * as transformDeprecationsNS from '../transform_deprecations';
import { transformDeprecations } from '../transform_deprecations';
/* eslint-enable import/no-duplicates */

describe('server/config completeMixin()', function () {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.restore());

  const setup = ({ settings, configValues }) => {
    const kbnServer = {
      settings,
    };

    const server = {
      decorate: noop,
    };

    const config = {
      get: sinon.stub().returns(configValues)
    };

    const callCompleteMixin = () => {
      completeMixin(kbnServer, server, config);
    };

    return { callCompleteMixin };
  };

  describe('all settings used', () => {
    it('should not throw', function () {
      const { callCompleteMixin } = setup({
        settings: {
          used: true
        },
        configValues: {
          used: true
        },
      });

      callCompleteMixin();
    });

    describe('more config values than settings', () => {
      it('should not throw', function () {
        const { callCompleteMixin } = setup({
          settings: {
            used: true
          },
          configValues: {
            used: true,
            foo: 'bar'
          }
        });

        callCompleteMixin();
      });
    });
  });

  describe('some settings unused', () => {
    it('should throw an error', function () {
      const { callCompleteMixin } = setup({
        settings: {
          unused: true
        },
        configValues: {
          used: true
        }
      });

      expect(callCompleteMixin).to.throwError('"unused" not applied');
    });
  });


  describe('deprecation support', () => {
    it('should transform settings when determining what is unused', function () {
      sandbox.spy(transformDeprecationsNS, 'transformDeprecations');

      const settings = {
        foo: 1
      };

      const { callCompleteMixin } = setup({
        settings,
        configValues: {
          ...settings
        }
      });

      callCompleteMixin();
      sinon.assert.calledOnce(transformDeprecations);
      expect(transformDeprecations.firstCall.args[0]).to.be(settings);
    });

    it('should use transformed settings when considering what is used', function () {
      sandbox.stub(transformDeprecationsNS, 'transformDeprecations', (settings) => {
        settings.bar = settings.foo;
        delete settings.foo;
        return settings;
      });

      const { callCompleteMixin } = setup({
        settings: {
          foo: 1
        },
        configValues: {
          bar: 1
        }
      });

      callCompleteMixin();
      sinon.assert.calledOnce(transformDeprecations);
    });
  });
});
