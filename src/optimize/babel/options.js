// this file is not transpiled

var helpers = require('./helpers');

helpers.setupBabelCache(process.env);

exports.webpack = {
  presets: ["react", "es2015", "stage-1"],
  plugins: ["add-module-exports"]
};
exports.node = {
  presets: ["es2015-node", "stage-1"],
  plugins: ["add-module-exports"],
  ignore: [
    /[\\\/](node_modules|bower_components|mock_data|scenarios)[\\\/]/
  ]
};
