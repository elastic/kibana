const {
  nodePresets,
  webpackPresets,
  plugins,
  buildIgnore
} = require('./helpers');

exports.webpack = {
  presets: webpackPresets,
  plugins: plugins
};
exports.node = {
  presets: nodePresets,
  plugins,
  ignore: buildIgnore
};
