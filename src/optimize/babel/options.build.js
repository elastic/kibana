const {
  nodePresets,
  webpackPresets,
  plugins,
  buildIgnore
} = require('./helpers');

const nodeOptions = {
  presets: nodePresets,
  plugins,
  ignore: buildIgnore
};

exports.webpack = {
  presets: webpackPresets,
  plugins: plugins
};

exports.node = nodeOptions;

exports.registerNodeOptions = function () {
  require('babel-register')(nodeOptions);
};
