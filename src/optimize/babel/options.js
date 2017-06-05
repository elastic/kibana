// this file is not transpiled in dev

const {
  nodePreset,
  webpackPreset,
  webpackCacheDir,
  devIgnore
} = require('./helpers');

const nodeOptions = {
  presets: [nodePreset],
  ignore: devIgnore
};

exports.webpack = {
  cacheDirectory: webpackCacheDir,
  presets: [webpackPreset],
};

exports.node = nodeOptions;

exports.registerNodeOptions = function () {
  require('babel-register')(nodeOptions);
};
