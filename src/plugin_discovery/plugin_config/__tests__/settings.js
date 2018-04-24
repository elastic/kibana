import expect from 'expect.js';
import sinon from 'sinon';

import { PluginSpec } from '../../plugin_spec';
import { getSettings } from '../settings';

describe('plugin_discovery/settings', () => {
  const pluginSpec = new PluginSpec('/dev/null', {
    id: 'test',
    version: 'kibana',
  }, {
    configPrefix: 'a.b.c',
    deprecations: ({ rename }) => [
      rename('foo', 'bar')
    ]
  });

  describe('getSettings()', () => {
    it('reads settings from config prefix', async () => {
      const rootSettings = {
        a: {
          b: {
            c: {
              enabled: false
            }
          }
        }
      };

      expect(await getSettings(pluginSpec, rootSettings))
        .to.eql({
          enabled: false
        });
    });

    it('allows rootSettings to be undefined', async () => {
      expect(await getSettings(pluginSpec))
        .to.eql(undefined);
    });

    it('resolves deprecations', async () => {
      const logDeprecation = sinon.stub();
      expect(await getSettings(pluginSpec, {
        a: {
          b: {
            c: {
              foo: true
            }
          }
        }
      }, logDeprecation)).to.eql({
        bar: true
      });

      sinon.assert.calledOnce(logDeprecation);
    });
  });
});
