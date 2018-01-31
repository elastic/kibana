const { resolve } = require('path');

// this must happen before `require('babel-register')` and can't be changed
// once the module has been loaded
if (!process.env.BABEL_CACHE_PATH) {
  process.env.BABEL_CACHE_PATH = resolve(__dirname, '../../optimize/.babelcache.json');
}

// paths that babel-register should ignore
const ignore = [
  /[\\\/](node_modules|bower_components)[\\\/]/,
  /[\\\/](kbn-build\/dist)[\\\/]/
];

if (global.__BUILT_WITH_BABEL__) {
  // when building the Kibana source we replace the statement
  // `global.__BUILT_WITH_BABEL__` with the value `true` so that
  // when babel-register is required for the first time by users
  // it will exclude kibana's `src` directory.
  //
  // We still need babel-register for plugins though, we've been
  // building their server code at require-time since version 4.2
  // TODO: the plugin install process could transpile plugin server code...
  ignore.push(resolve(__dirname, '../../src'));
}

// modifies all future calls to require() to automatically
// compile the required source with babel
require('babel-register')({
  ignore,
  babelrc: false,
  presets: [
    require.resolve('@kbn/babel-preset/node')
  ],
});
