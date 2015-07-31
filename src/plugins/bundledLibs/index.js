module.exports = function (kibana) {
  let _ = require('lodash');
  let fromRoot = require('../../utils/fromRoot');
  let { readdirSync } = require('fs');
  let { resolve, basename } = require('path');

  let modules = {};
  let metaLibs = resolve(__dirname, 'metaLibs');
  readdirSync(metaLibs).forEach(function (file) {
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
