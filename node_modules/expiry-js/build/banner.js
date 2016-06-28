(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function () {
      /* eslint no-return-assign: 0 */
      return root.expiry = factory();
    });
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.expiry = factory();
  }
}(this, function () {

