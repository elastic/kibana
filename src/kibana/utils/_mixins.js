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
  var _ = require('lodash_src').runInContext(window);
  require('utils/_mixins_chainable')(_);
  require('utils/_mixins_notchainable')(_);
  return _;
});
