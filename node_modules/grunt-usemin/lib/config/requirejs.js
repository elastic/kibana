'use strict';

var path = require('path');

exports.name = 'requirejs';

//
// Output a config for the furnished block
// The context variable is used both to take the files to be treated
// (inFiles) and to output the one(s) created (outFiles).
// It also conveys whether or not the current process is the last of the pipe
//
exports.createConfig = function (context, block) {
  var cfg = {};
  var options = {};
  var requirejs = context.options || {};
  context.outFiles = [];

  if (!block.requirejs) {
    return {};
  }

  var baseUrl = path.join(context.inDir, block.requirejs.baseUrl);
  var out = path.join(context.outDir, block.requirejs.dest);
  var cfgFile = path.join(context.inDir, block.requirejs.baseUrl, block.requirejs.name);
  if (!cfgFile.match(/\.js/)) {
    cfgFile = cfgFile + '.js';
  }

  options.name = block.requirejs.name;
  options.out = out;
  options.baseUrl = baseUrl;
  options.mainConfigFile = cfgFile;

  var hasTasks;
  for (var i in requirejs) {
    if (requirejs.hasOwnProperty(i)) {
      hasTasks = true;
      var task = requirejs[i];
      var opts = task.options;
      if (opts) {
        opts.name = opts.name || options.name;
        opts.out = opts.out || options.out;
        opts.baseUrl = opts.baseUrl || options.baseUrl;
        opts.mainConfigFile = opts.mainConfigFile || options.mainConfigFile;
      } else {
        task.options = options;
      }
    }
  }

  if (!hasTasks) {
    cfg['default'] = {
      options: options
    };
  }

  return cfg;
};
