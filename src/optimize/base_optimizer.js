import webpack from 'webpack';
import Boom from 'boom';
import DirectoryNameAsMain from 'webpack-directory-name-as-main';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import CommonsChunkPlugin from 'webpack/lib/optimize/CommonsChunkPlugin';
import DefinePlugin from 'webpack/lib/DefinePlugin';
import UglifyJsPlugin from 'webpack/lib/optimize/UglifyJsPlugin';

import fromRoot from '../utils/from_root';
import babelOptions from './babel_options';
import { inherits } from 'util';
import { defaults, transform } from 'lodash';
import { resolve } from 'path';
import { writeFile } from 'fs';
const babelExclude = [/[\/\\](webpackShims|node_modules|bower_components)[\/\\]/];
import pkg from '../../package.json';

class BaseOptimizer {
  constructor(opts) {
    this.env = opts.env;
    this.urlBasePath = opts.urlBasePath;
    this.bundles = opts.bundles;
    this.profile = opts.profile || false;

    switch (opts.sourceMaps) {
      case true:
        this.sourceMaps = 'source-map';
        break;

      case 'fast':
        this.sourceMaps = 'cheap-module-eval-source-map';
        break;

      default:
        this.sourceMaps = opts.sourceMaps || false;
        break;
    }

    this.unsafeCache = opts.unsafeCache || false;
    if (typeof this.unsafeCache === 'string') {
      this.unsafeCache = [
        new RegExp(this.unsafeCache.slice(1, -1))
      ];
    }
  }

  async initCompiler() {
    if (this.compiler) return this.compiler;

    const compilerConfig = this.getConfig();
    this.compiler = webpack(compilerConfig);

    this.compiler.plugin('done', stats => {
      if (!this.profile) return;

      const path = resolve(this.env.workingDir, 'stats.json');
      const content = JSON.stringify(stats.toJson());
      writeFile(path, content, function (err) {
        if (err) throw err;
      });
    });

    return this.compiler;
  }

  getConfig() {
    const mapQ = this.sourceMaps ? '?sourceMap' : '';
    const mapQPre = mapQ ? mapQ + '&' : '?';

    return {
      context: fromRoot('.'),
      entry: this.bundles.toWebpackEntries(),

      devtool: this.sourceMaps,
      profile: this.profile || false,

      output: {
        path: this.env.workingDir,
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: `${this.urlBasePath || ''}/bundles/`,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
      },

      recordsPath: resolve(this.env.workingDir, 'webpack.records'),

      plugins: [
        new webpack.ResolverPlugin([
          new DirectoryNameAsMain()
        ]),
        new webpack.NoErrorsPlugin(),
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        }),
        new CommonsChunkPlugin({
          name: 'commons',
          filename: 'commons.bundle.js'
        }),
        ...this.pluginsForEnv(this.env.context.env)
      ],

      module: {
        loaders: [
          {
            test: /\.less$/,
            loader: ExtractTextPlugin.extract(
              'style',
              `css${mapQ}!autoprefixer${mapQPre}{ "browsers": ["last 2 versions","> 5%"] }!less${mapQPre}dumpLineNumbers=comments`
            )
          },
          {
            test: /\.scss$/,
            loader: ExtractTextPlugin.extract(
              'style',
              `css${mapQ}!autoprefixer${mapQPre}{ "browsers": ["last 2 versions","> 5%"] }!sass${mapQPre}`
            )
          },
          { test: /\.css$/, loader: ExtractTextPlugin.extract('style', `css${mapQ}`) },
          { test: /\.jade$/, loader: 'jade' },
          { test: /\.json$/, loader: 'json' },
          { test: /\.(html|tmpl)$/, loader: 'raw' },
          { test: /\.png$/, loader: 'url?limit=10000&name=[path][name].[ext]' },
          { test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/, loader: 'file?name=[path][name].[ext]' },
          { test: /[\/\\]src[\/\\](core_plugins|ui)[\/\\].+\.js$/, loader: `rjs-repack${mapQ}` },
          {
            test: /\.js$/,
            exclude: babelExclude.concat(this.env.noParse),
            loader: 'babel',
            query: babelOptions.webpack
          },
          {
            test: /\.jsx$/,
            exclude: babelExclude.concat(this.env.noParse),
            loader: 'babel',
            query: defaults({
              nonStandard: true,
            }, babelOptions.webpack)
          }
        ].concat(this.env.loaders),
        postLoaders: this.env.postLoaders || [],
        noParse: this.env.noParse,
      },

      resolve: {
        extensions: ['.js', '.json', '.jsx', '.less', ''],
        postfixes: [''],
        modulesDirectories: ['webpackShims', 'node_modules'],
        fallback: [fromRoot('webpackShims'), fromRoot('node_modules')],
        loaderPostfixes: ['-loader', ''],
        root: fromRoot('.'),
        alias: this.env.aliases,
        unsafeCache: this.unsafeCache,
      },

      resolveLoader: {
        alias: transform(pkg.dependencies, function (aliases, version, name) {
          if (name.endsWith('-loader')) {
            aliases[name.replace(/-loader$/, '')] = require.resolve(name);
          }
        }, {})
      }
    };
  }

  pluginsForEnv(env) {
    if (env !== 'production') {
      return [];
    }

    return [
      new DefinePlugin({
        'process.env': {
          'NODE_ENV': '"production"'
        }
      }),
      new UglifyJsPlugin({
        compress: {
          warnings: false
        },
        sourceMap: false,
        mangle: false
      }),
    ];
  }

  failedStatsToError(stats) {
    const statFormatOpts = {
      hash: false,  // add the hash of the compilation
      version: false,  // add webpack version information
      timings: false,  // add timing information
      assets: false,  // add assets information
      chunks: false,  // add chunk information
      chunkModules: false,  // add built modules information to chunk information
      modules: false,  // add built modules information
      cached: false,  // add also information about cached (not built) modules
      reasons: false,  // add information about the reasons why modules are included
      source: false,  // add the source code of modules
      errorDetails: false,  // add details to errors (like resolving log)
      chunkOrigins: false,  // add the origins of chunks and chunk merging info
      modulesSort: false,  // (string) sort the modules by that field
      chunksSort: false,  // (string) sort the chunks by that field
      assetsSort: false,  // (string) sort the assets by that field
      children: false,
    };

    const details = stats.toString(defaults({ colors: true }, statFormatOpts));

    return Boom.create(
      500,
      `Optimizations failure.\n${details.split('\n').join('\n    ')}\n`,
      stats.toJson(statFormatOpts)
    );
  }
}

module.exports = BaseOptimizer;
