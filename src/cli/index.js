// load the babel options seperately so that they can modify the process.env
// before calling babel/register
const babelOptions = require('../optimize/babelOptions').node;
require('babel/register')(babelOptions);
require('./cli');
