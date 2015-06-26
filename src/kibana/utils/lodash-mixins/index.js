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
  require('/utils/lodash-mixins/string.js')(_);
  require('/utils/lodash-mixins/lang.js')(_);
  require('/utils/lodash-mixins/object.js')(_);
  require('/utils/lodash-mixins/collection.js')(_);
  require('/utils/lodash-mixins/function.js')(_);
  require('/utils/lodash-mixins/oop.js')(_);
  return _;
});
