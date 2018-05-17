const { resolve } = require('path');

// this must happen before `require('babel-register')` and can't be changed
// once the module has been loaded
if (!process.env.BABEL_CACHE_PATH) {
  process.env.BABEL_CACHE_PATH = resolve(__dirname, '../../optimize/.babelcache.json');
}

// paths that babel-register should ignore
const ignore = [
  /\/bower_components\//,
  /\/kbn-pm\/dist\//,

  // TODO: remove this and just transpile plugins at build time, but
  // has tricky edge cases that will probably require better eslint
  // restrictions to make sure that code destined for the server/browser
  // follows respects the limitations of each environment.
  //
  // https://github.com/elastic/kibana/issues/14800#issuecomment-366130268

  // ignore paths matching `/node_modules/{a}/{b}`, unless `a`
  // is `x-pack` and `b` is not `node_modules`
  /\/node_modules\/(?!x-pack\/(?!node_modules)([^\/]+))([^\/]+\/[^\/]+)/
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
    require.resolve('@kbn/babel-preset/node_preset')
  ],
});
