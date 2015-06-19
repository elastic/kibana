define(function (require) {
  /**
   * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
   *
   * use:
   * var _ = require('lodash');
   *
   * require.js config points the 'lodash' id to
   * this module, which provides a modified version
   * of lodash.
   */
  var _ = require('lodash_src').runInContext();
  require('utils/lodash-mixins/string')(_);
  require('utils/lodash-mixins/lang')(_);
  require('utils/lodash-mixins/object')(_);
  require('utils/lodash-mixins/collection')(_);
  require('utils/lodash-mixins/function')(_);
  require('utils/lodash-mixins/oop')(_);
  return _;
});
