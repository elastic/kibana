'use strict';

module.exports = function (kibana) {
  let _ = require('lodash');
  let resolve = require('path').resolve;
  let basename = require('path').basename;
  let readdir = require('fs').readdirSync;
  let fromRoot = require('../../utils/fromRoot');

  let modules = {
    ui: fromRoot('src/ui')
  };

  let metaLibs = resolve(__dirname, 'metaLibs');
  readdir(metaLibs).forEach(function (file) {
    if (file[0] === '.') return;
    let name = basename(file, '.js') + '$';
    modules[name] = resolve(metaLibs, file);
  });

  var bowerComponentsDir = fromRoot('bower_components');

  return new kibana.Plugin({
    init: false,
    uiExports: {
      modules: modules,
      noParse: [
        /node_modules\/angular\//,
        {
          test: function (request) {
            return _.endsWith(request, '.js')
            && _.includes(request, bowerComponentsDir)
            && !_.includes(request, 'bower_components/gridster');
          }
        }
      ]
    }
  });
};
