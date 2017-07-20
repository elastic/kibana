const babelJest = require('babel-jest');
const options = require('../optimize/babel/options');

const babelOptions = options.webpack;

module.exports = babelJest.createTransformer(babelOptions);
