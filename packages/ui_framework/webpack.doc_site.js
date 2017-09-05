const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base');

module.exports = merge(baseConfig, {
  devtool: 'source-map',

  entry: {
    guide: './doc_site/src/index.js'
  },

  output: {
    path: path.resolve(__dirname, 'doc_site/build'),
    filename: 'bundle.js'
  },

  resolve: {
    root: [
      path.resolve(__dirname, 'packages/ui_framework/doc_site')
    ]
  },

  module: {
    loaders: [{
      test: /\.scss$/,
      loaders: ['style', 'css', 'postcss', 'sass'],
      exclude: /node_modules/
    }],
  },
});
