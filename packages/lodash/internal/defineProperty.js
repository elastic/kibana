var getNative = require('./getNative');

var defineProperty = (function() {
    try {
      var func = getNative(Object, 'defineProperty');
      func({}, '', {});
      return func;
    } catch (e) {}
}());

module.exports = defineProperty;