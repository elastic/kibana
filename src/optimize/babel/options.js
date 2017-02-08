// this file is not transpiled in dev

const {
  nodePresets,
  webpackPresets,
  webpackCacheDir,
  plugins,
  devIgnore
} = require('./helpers');

exports.webpack = {
  cacheDirectory: webpackCacheDir,
  presets: webpackPresets,
  plugins: plugins
};
exports.node = {
  presets: nodePresets,
  plugins,
  ignore: devIgnore
};
