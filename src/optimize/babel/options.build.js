// this file is not transpiled

var helpers = require('./helpers');

helpers.setupBabelCache(process.env);

exports.webpack = require('@elastic/babel-preset-kibana/webpack');
exports.react = require('@elastic/babel-preset-kibana/webpack');
exports.node = Object.assign(
  {},
  require('@elastic/babel-preset-kibana/node'),
  {
    ignore: [
      helpers.fromRoot('src'),
      /[\\\/](node_modules|bower_components)[\\\/]/
    ]
  }
);
