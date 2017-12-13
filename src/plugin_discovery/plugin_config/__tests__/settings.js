import expect from 'expect.js';
import sinon from 'sinon';

import { PluginPack } from '../../plugin_pack';
import { getSettings } from '../settings';

describe('plugin_discovery/settings', () => {
  const pluginSpec = new PluginPack({
    path: '/dev/null',
    pkg: {
      name: 'test',
      version: 'kibana',
    },
    provider: ({ Plugin }) => new Plugin({
      configPrefix: 'a.b.c',
      deprecations: ({ rename }) => [
        rename('foo', 'bar')
      ]
    }),
  })
    .getPluginSpecs()
    .pop();

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
