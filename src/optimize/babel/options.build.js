const {
  nodePreset,
  webpackPreset,
  buildIgnore
} = require('./helpers');

const nodeOptions = {
  presets: [nodePreset],
  ignore: buildIgnore
};

exports.webpack = {
  presets: [webpackPreset],
};

exports.node = nodeOptions;

exports.registerNodeOptions = function () {
  require('babel-register')(nodeOptions);
};
