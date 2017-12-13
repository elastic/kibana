import { callPluginHook } from './lib';

/**
 *  KbnServer mixin that initializes all plugins found in ./scan mixin
 *  @param  {KbnServer} kbnServer
 *  @param  {Hapi.Server} server
 *  @param  {Config} config
 *  @return {Promise<undefined>}
 */
export async function initializeMixin(kbnServer, server, config) {
  if (!config.get('plugins.initialize')) {
    server.log(['info'], 'Plugin initialization disabled.');
    return;
  }

  async function callHookOnPlugins(hookName) {
    const { plugins } = kbnServer;
    const ids = plugins.map(p => p.id);

    for (const id of ids) {
      await callPluginHook(hookName, plugins, id, []);
    }
  }

  await callHookOnPlugins('preInit');
  await callHookOnPlugins('init');
}
