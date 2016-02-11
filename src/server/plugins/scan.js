import _ from 'lodash';
import { fromNode } from 'bluebird';
import { readdir, stat } from 'fs';
import { resolve, join } from 'path';
import { each } from 'bluebird';
import PluginCollection from './PluginCollection';
module.exports = async (kbnServer, server, config) => {

  var plugins = kbnServer.plugins = new PluginCollection(kbnServer);

  let scanDirs = [].concat(config.get('plugins.scanDirs') || []);
  let pluginPaths = [].concat(config.get('plugins.paths') || []);

  let debug = _.bindKey(server, 'log', ['plugins', 'debug']);
  let warning = _.bindKey(server, 'log', ['plugins', 'warning']);

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

      let path = resolve(dir, name);
      let stats = await fromNode(cb => stat(path, cb));
      if (stats.isDirectory()) {
        pluginPaths.push(path);
      }
    });
  });

  async function attemptLoad(path, name, method) {
    try {
      const success = await plugins[method](path);
      if (success) {
        debug({ tmpl: 'Found plugin at "<%= path %>"', path });
        return true;
      }
    } catch (err) {
      warning({ tmpl: 'Failed to load plugin at "<%= path %>": <%= err.message %>', path, err });
    } finally {
      debug({ tmpl: 'Non-plugin directory found at "<%= path %>"', path});
      return false;
    }
  }

  for (let path of pluginPaths) {
    const dirSuccess = attemptLoad(path, 'Plugin directory', 'new');
    const pkgSuccess = attemptLoad(path, 'Package-based plugin', 'newFromPackageJson');
    if (!dirSuccess && !pkgSuccess) {
      warning({ tmpl: 'Unable to load a plugin from directory "<%= path %>"', path: path });
    }
  }
};
