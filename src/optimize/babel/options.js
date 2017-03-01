// this file is not transpiled in dev

const {
  nodePresets,
  webpackPresets,
  webpackCacheDir,
  plugins,
  devIgnore
} = require('./helpers');

const nodeOptions = {
  presets: nodePresets,
  plugins,
  ignore: devIgnore
};

exports.webpack = {
  cacheDirectory: webpackCacheDir,
  presets: webpackPresets,
  plugins: plugins
};

exports.node = nodeOptions;

exports.registerNodeOptions = function () {
  require('babel-register')(nodeOptions);
};
