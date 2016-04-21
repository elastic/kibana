// this file is not transpiled

var helpers = require('./helpers');

helpers.setupBabelCache(process.env);

exports.webpack = require('@elastic/babel-preset-kibana/webpack');
exports.node = require('@elastic/babel-preset-kibana/node');
