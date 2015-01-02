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
  var _ = require('lodash_src');
  _.mixin(require('lodash-deep'));
  _.mixin(require('utils/_mixins_chainable'), { chain: true });
  _.mixin(require('utils/_mixins_notchainable'), { chain: false });

  return _;
});
