// this file is not transpiled in dev

// this will set babel cache paths as environment variables,
// it needs to be loaded before babel-register
const babelOptions = require('./options').node

require('babel-polyfill');
require('babel-register')(babelOptions);
