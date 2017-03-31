const babelJest = require('babel-jest');
const options = require('../../../src/optimize/babel/options');

const babelOptions = options.webpack;

module.exports = babelJest.createTransformer(babelOptions);
