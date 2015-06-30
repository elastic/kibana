module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');
  var extname = require('path').extname;
  var basename = require('path').basename;
  var dirname = require('path').dirname;
  var relative = require('path').relative;
  var join = require('path').join;
  var webpack = require('webpack');
  var Promise = require('bluebird');

  var apps = kbnServer.uiExports.apps;
  var uiDir = require('../ui/assetsDir');
  var glob = _.wrap(Promise.promisify(require('glob')), function (gb, dir) {
    return gb('**/*', {
      cwd: dir,
      silent: true,
      strict: true,
      nodir: true,
      follow: false
    });
  });

  var status = kbnServer.status.create('optimize');
  status.yellow('Optimizing and caching browser bundles');

  // don't return promise !!
  // use status api
  _(server.plugins)
  .pluck('plugin')
  .filter('publicDir')
  .map(function (plugin) {
    return glob(plugin.publicDir).then(function (matches) {
      return {
        id: plugin.id,
        dir: plugin.publicDir,
        files: matches
      };
    });
  })
  .concat([
    glob(uiDir).then(function (files) {
      return {
        id: 'ui',
        dir: uiDir,
        files: files
      };
    })
  ])
  .thru(Promise.all)
  .value()
  .reduce(function (aliases, match) {
    match.files.forEach(function (file) {
      var path = join(match.dir, file);
      var ext = extname(file);
      var name = basename(file, ext === '.js' ? ext : '');
      var folders = dirname(file); // switch to / for moduleids/urls
      var base = match.id === 'ui' ? '' : 'plugins/' + match.id;

      // filter out less files
      if (ext === '.less') return;

      // prevent './module' style paths
      if (folders === '.') folders = '';

      var alias = _.compact([base, folders, name]).join('/').replace(/\\/g, '/');
      aliases[alias + '$'] = path;
    });

    return aliases;
  }, {})
  .then(function (aliases) {
    var compiler = webpack({
      entry: _.mapValues(apps, 'main'),

      output: {
        path: join(__dirname, '..', 'bundles'),
        filename: '[name].bundle.js'
      },

      plugins: [
        new webpack.NoErrorsPlugin(),

        new webpack.DefinePlugin({
          'process.env': {
            BROWSER: JSON.stringify(true),
            NODE_ENV: JSON.stringify('development')
          }
        }),

        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin()
      ],

      resolve: {
        extensions: ['.js'],
        packageMains: [],
        modulesDirectories: [],
        root: [],
        aliases: aliases
      }
    });

    return Promise.fromNode(compiler.run.bind(compiler));
  })
  .then(
    function () { status.green('Optimization complete'); },
    function (err) {
      status.red('Optimization failure! ' + err.message);
      server.log(['fatal'], err);
    }
  );
};
