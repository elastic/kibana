// this file is not transpiled in dev

const env = process.env;
const fromRoot = require('path').resolve.bind(null, __dirname, '../../../');

if (!env.BABEL_CACHE_PATH) {
  env.BABEL_CACHE_PATH = fromRoot('optimize/.babelcache.json');
}

exports.webpackCacheDir = env.WEBPACK_BABEL_CACHE_DIR || fromRoot('optimize/.webpack.babelcache');

exports.nodePresets = [
  [
    require.resolve('babel-preset-env'),
    {
      targets: {
        node: 'current'
      }
    }
  ],
  require.resolve('babel-preset-stage-1'),
  require.resolve('babel-preset-react'),
];

exports.webpackPresets = [
  [
    require.resolve('babel-preset-env'),
    {
      targets: {
        browsers: [
          'last 2 versions',
          '> 5%',
          'Safari 7' // for PhantomJS support
        ]
      }
    }
  ],
  require.resolve('babel-preset-stage-1'),
  require.resolve('babel-preset-react'),
]

exports.plugins = [
  require.resolve('babel-plugin-add-module-exports'),
];

exports.devIgnore = [
  /[\\\/](node_modules|bower_components)[\\\/]/
]

exports.buildIgnore = [
  fromRoot('src'),
  ...exports.devIgnore
]
