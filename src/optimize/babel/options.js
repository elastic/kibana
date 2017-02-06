// this file is not transpiled in dev

const {
  nodePresets,
  webpackPresets,
  plugins,
  devIgnore
} = require('./helpers');

exports.webpack = {
  presets: webpackPresets,
  plugins: plugins
};
exports.node = {
  presets: nodePresets,
  plugins,
  ignore: devIgnore
};
