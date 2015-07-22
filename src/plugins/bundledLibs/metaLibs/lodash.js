/**
 * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
 *
 * use:
 * var _ = require('lodash');
 */

var _ = require('bower_components/lodash/lodash').runInContext();
require('utils/lodash-mixins/string')(_);
require('utils/lodash-mixins/lang')(_);
require('utils/lodash-mixins/object')(_);
require('utils/lodash-mixins/collection')(_);
require('utils/lodash-mixins/function')(_);
require('utils/lodash-mixins/oop')(_);
module.exports = _;
