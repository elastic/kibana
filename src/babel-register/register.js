const { resolve } = require('path');

// this must happen before `require('babel-register')` and can't be changed
// once the module has been loaded
if (!process.env.BABEL_CACHE_PATH) {
  process.env.BABEL_CACHE_PATH = resolve(__dirname, '../../optimize/.babelcache.json');
}

// paths that babel-register should ignore
const ignore = [
  /[\\\/](node_modules|bower_components)[\\\/]/,
];

if (global.__BUILT_WITH_BABEL__) {
  // in "production" builds we define `typeof BUILT_WITH_BABEL` as `true`
  // which indicates that all of the code in the `src` directory is already
  // built and can be ignored by `babel-register`
  ignore.push(resolve(__dirname, '../../src'));
}

// modifies all future calls to require() to automatically
// compile the required source with babel
require('babel-register')({
  ignore,
  babelrc: false,
  presets: [
    require.resolve('../babel-preset/node')
  ],
});
