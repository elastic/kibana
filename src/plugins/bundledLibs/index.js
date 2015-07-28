'use strict';

module.exports = function (kibana) {
  let _ = require('lodash');
  let resolve = require('path').resolve;
  let basename = require('path').basename;
  let readdir = require('fs').readdirSync;
  let fromRoot = require('../../utils/fromRoot');

  let modules = {};
  let metaLibs = resolve(__dirname, 'metaLibs');
  readdir(metaLibs).forEach(function (file) {
    if (file[0] === '.') return;
    let name = basename(file, '.js') + '$';
    modules[name] = resolve(metaLibs, file);
  });

  return new kibana.Plugin({
    init: false,
    uiExports: {
      modules: modules,
      noParse: [
        /node_modules\/(angular|elasticsearch-browser|mocha)\//
      ]
    }
  });
};
