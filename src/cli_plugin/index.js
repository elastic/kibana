// kibana-jscodeshift-no-babel
// load the babel options seperately so that they can modify the process.env
// before calling babel/register
const babelOptions = require('../optimize/babel_options').node;
require('babel/register')(babelOptions);
require('./cli');
