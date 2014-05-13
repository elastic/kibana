define(function (require) {
  return function AbstractFieldType() {
    var _ = require('lodash');

    function Abstract() {}

    Abstract.extend = function (Super) {
      Super.prototype = _.create(Abstract.prototype, { constructor: Super });
    };

    Abstract.prototype.toString = function () {
      return '' + this._val;
    };

    Abstract.prototype.valueOf = function () {
      return this._val;
    };

    Abstract.prototype.toJSON = function () {
      return this._val;
    };

    return Abstract;
  };
});