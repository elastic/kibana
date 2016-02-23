import { partial, bindKey } from 'lodash';
import { fromNode } from 'bluebird';
import { readdir, stat } from 'fs';
import { resolve, join } from 'path';
import { each } from 'bluebird';
import PluginCollection from './PluginCollection';

export default async function scanMixin(kbnServer, server, config) {
  const plugins = kbnServer.plugins = new PluginCollection(kbnServer);
  const log = {
    debug: bindKey(server, 'log', ['plugins', 'debug']),
    warning: bindKey(server, 'log', ['plugins', 'warning']),
  };

  const scanDirs = [].concat(config.get('plugins.scanDirs') || []);
  const pluginPaths = [].concat(config.get('plugins.paths') || [], await scanForPlugins(log, scanDirs));
  await loadPluginsFromPaths(plugins, log, pluginPaths);
}

export async function scanForPlugins({ debug, warning }, scanDirs) {
  const pluginPaths = [];

  // scan all scanDirs to find pluginPaths
  await each(scanDirs, async dir => {
    debug({ tmpl: 'Scanning `<%= dir %>` for plugins', dir: dir });

    let filenames = null;
    try {
      filenames = await fromNode(cb => readdir(dir, cb));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;

      filenames = [];
      warning({
        tmpl: '<%= err.code %>: Unable to scan non-existent directory for plugins "<%= dir %>"',
        err: err,
        dir: dir
      });
    }

    await each(filenames, async name => {
      if (name[0] === '.') return;

      const path = resolve(dir, name);
      const stats = await fromNode(cb => stat(path, cb));
      if (stats.isDirectory()) {
        pluginPaths.push(path);
      }
    });
  });

  return pluginPaths;
}

export async function loadPluginsFromPaths(plugins, { debug, warning }, pluginPaths) {

  async function attemptLoad(path, name, method) {
    try {
      const success = await plugins[method](path);
      if (success) {
        debug({ tmpl: 'Found plugin at "<%= path %>"', path });
        return true;
      }
    } catch (err) {
      warning({ tmpl: 'Failed to load plugin at "<%= path %>": <%= err.message %>', path, err });
    }

    debug({ tmpl: 'Non-plugin directory found at "<%= path %>"', path});
    return false;
  }

  for (let path of pluginPaths) {
    const dirSuccess = await attemptLoad(path, 'Plugin directory', 'new');
    const pkgSuccess = await attemptLoad(path, 'Package-based plugin', 'newFromPackageJson');
    if (!dirSuccess && !pkgSuccess) {
      warning({ tmpl: 'Unable to load a plugin from directory "<%= path %>"', path: path });
    }
  }
}
