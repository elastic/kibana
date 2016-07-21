module.exports = async (kbnServer, server, config) => {
  let _ = require('lodash');
  let { fromNode } = require('bluebird');
  let { readdir, stat } = require('fs');
  let { resolve } = require('path');
  let { each } = require('bluebird');

  var PluginCollection = require('./PluginCollection');
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

  for (let path of pluginPaths) {
    let modulePath;
    try {
      modulePath = require.resolve(path);
    } catch (e) {
      warning({ tmpl: 'Skipping non-plugin directory at <%= path %>', path: path });
      continue;
    }

    await plugins.new(path);
    debug({ tmpl: 'Found plugin at <%= path %>', path: modulePath });
  }
};
