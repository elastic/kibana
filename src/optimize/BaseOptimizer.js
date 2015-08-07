let { inherits } = require('util');
let _ = require('lodash');
let { join } = require('path');
let write = require('fs').writeFileSync;
let webpack = require('webpack');
let DirectoryNameAsMain = require('webpack-directory-name-as-main');
let ExtractTextPlugin = require('extract-text-webpack-plugin');

let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');
let babelOptions = require('./babelOptions');

class BaseOptimizer {
  constructor(opts) {
    this.env = opts.env;
    this.bundles = opts.bundles;
    this.sourceMaps = opts.sourceMaps || false;
  }

  async initCompiler() {
    return this.compiler || (this.compiler = webpack(this.getConfig()));
  }

  getConfig() {
    let mapQ = this.sourceMaps ? '?sourceMap' : '';

    return {
      context: fromRoot('.'),
      entry: this.bundles.toWebpackEntries(),

      devtool: this.sourceMaps ? '#source-map' : false,

      output: {
        path: this.env.workingDir,
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: '/bundles/',
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
      },

      plugins: [
        new webpack.ResolverPlugin([
          new DirectoryNameAsMain()
        ]),
        new webpack.NoErrorsPlugin(),
        new webpack.optimize.DedupePlugin(),
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        })
      ],

      module: {
        loaders: [
          {
            test: /\.less$/,
            loader: ExtractTextPlugin.extract(
              'style',
              `css${mapQ}!autoprefixer?{ "browsers": ["last 2 versions","> 5%"] }!less${mapQ}`
            )
          },
          { test: /\.css$/, loader: ExtractTextPlugin.extract('style', `css${mapQ}`) },
          { test: /\.jade$/, loader: 'jade' },
          { test: /\.(html|tmpl)$/, loader: 'raw' },
          { test: /\.png$/, loader: 'url?limit=10000&name=[path][name].[ext]' },
          { test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/, loader: 'file?name=[path][name].[ext]' },
          { test: /[\/\\]src[\/\\](plugins|ui)[\/\\].+\.js$/, loader: `auto-preload-rjscommon-deps${mapQ}` },
          {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            loader: 'babel',
            query: babelOptions
          },
          {
            // explicitly require .jsx extension to support jsx
            test: /\.jsx$/,
            exclude: /(node_modules|bower_components)/,
            loader: 'babel',
            query: _.defaults({
              nonStandard: true
            }, babelOptions)
          }
        ].concat(this.env.loaders),
        noParse: this.env.noParse,
      },

      resolve: {
        extensions: ['.js', '.less', ''],
        postfixes: [''],
        modulesDirectories: ['node_modules'],
        loaderPostfixes: ['-loader', ''],
        root: fromRoot('.'),
        alias: this.env.aliases
      }
    };
  }
}

module.exports = BaseOptimizer;
