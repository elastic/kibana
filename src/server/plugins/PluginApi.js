'use strict';

var Plugin = require('./Plugin');
var basename = require('path').basename;
var join = require('path').join;

module.exports = class PluginApi {
  constructor(kibana, pluginPath) {
    this.config = kibana.server.config();
    this.rootDir = kibana.rootDir;
    this.package = require(join(pluginPath, 'package.json'));
    this.autoload = require('../ui/autoload');
    this.Plugin = Plugin.scoped(kibana, pluginPath, this.package);
  }
};
