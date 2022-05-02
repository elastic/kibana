import * as vm from 'vm';
import { buildCustomRequire, buildDefaultAppContext } from './custom_require';
import { ProxiedPlugin } from './proxied_plugin';
import type { ParsedPlugin } from './parser';
import * as path from 'path';

export const compileProxiedPlugin = ({ files, info }: ParsedPlugin, initializerContext: any) => {
  const exports = {};
  const appId = `${info.id}_${info.version.replace(/\./g, '_')}`;
  const entryFile = path.join('.', 'index.js');
  const customRequire = buildCustomRequire(files, appId);
  const context = buildDefaultAppContext({ require: customRequire, exports, process: {}, console });
  const script = new vm.Script(files[entryFile]);
  const exportedPlugin = script.runInContext(context);


  if (typeof exportedPlugin !== 'function') {
      // tslint:disable-next-line:max-line-length
      throw new Error(`missing exported plugin in ${entryFile}`);
  }

  const instance = vm.runInNewContext('plugin(initializerContext)', buildDefaultAppContext({
    plugin: exportedPlugin,
    initializerContext,
    process: {},
  }), { timeout: 1000, filename: `plugin_${appId}.js` });

  if (!instance || typeof instance !== 'object') {
    throw new Error(
      `Initializer for plugin "${
        info.id
      }" is expected to return plugin instance, but returned "${typeof instance}".`
    );
  }

  return new ProxiedPlugin(instance, customRequire);
}