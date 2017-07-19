// this file is not transpiled in dev

const env = process.env;
const fromRoot = require('path').resolve.bind(null, __dirname, '../../../');

if (!env.BABEL_CACHE_PATH) {
  env.BABEL_CACHE_PATH = fromRoot('optimize/.babelcache.json');
}

exports.webpackCacheDir = env.WEBPACK_BABEL_CACHE_DIR || fromRoot('optimize/.webpack.babelcache');

const commonPreset = {
  presets: [
    require.resolve('babel-preset-react')
  ],
  plugins: [
    require.resolve('babel-plugin-add-module-exports'),
    // stage 3
    require.resolve('babel-plugin-transform-async-generator-functions'),
    require.resolve('babel-plugin-transform-object-rest-spread'),
    // stage 2
    require.resolve('babel-plugin-transform-class-properties'),
  ],
}

exports.nodePreset = {
  presets: [
    [require.resolve('babel-preset-env'), {
      targets: {
        node: 'current'
      },
      useBuiltIns: true,
    }],
    commonPreset,
  ],
};

exports.webpackPreset = {
  presets: [
    [require.resolve('babel-preset-env'), {
      targets: {
        browsers: [
          'last 2 versions',
          '> 5%',
          'Safari 7' // for PhantomJS support
        ]
      },
      useBuiltIns: true,
    }],
    commonPreset,
  ],
}

exports.devIgnore = [
  /[\\\/](node_modules|bower_components)[\\\/]/
]

exports.buildIgnore = [
  fromRoot('src'),
  ...exports.devIgnore
]
