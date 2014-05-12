define(function (require) {
  return function AbstractFieldType() {
    var _ = require('lodash');

    function Abstract() {}

    Abstract.extend = function (Sub) {
      Sub.prototype = _.create(Abstract.prototype, { constructor: Sub });
    };

    Abstract.rawValue = function () {
      return this._val;
    };

    Abstract.prototype.toString = function () {
      return this._val.toString();
    };

    Abstract.prototype.valueOf = function () {
      // return this, so that string concat will automatically
      // work and use the toString of this object rather than
      // the toString method of this._val;
      return this;
    };

    Abstract.prototype.toJSON = function () {
      return this._val;
    };

    return Abstract;
  };
});