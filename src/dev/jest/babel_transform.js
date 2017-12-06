const babelJest = require('babel-jest');
const options = require('../optimize/babel/options');

const babelOptions = options.node;

module.exports = babelJest.createTransformer(babelOptions);
