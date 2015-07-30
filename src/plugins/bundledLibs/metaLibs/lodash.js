/**
 * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
 *
 * use:
 * var _ = require('lodash');
 */

var _ = require('node_modules/lodash/index.js').runInContext();
require('ui/utils/lodash-mixins/string')(_);
require('ui/utils/lodash-mixins/lang')(_);
require('ui/utils/lodash-mixins/object')(_);
require('ui/utils/lodash-mixins/collection')(_);
require('ui/utils/lodash-mixins/function')(_);
require('ui/utils/lodash-mixins/oop')(_);
module.exports = _;
