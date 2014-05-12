define(function (require) {
  return function DateFieldType(Private) {
    var Abstract = Private(require('./_abstract'));
    var moment = require('moment');

    function Date(val) {
      this._val = val;
    }

    Abstract.extend(Date);

    Date.prototype._moment = function () {
      // lazy eval the moment object
      return this._m || (this._m = moment(this._val));
    };

    Date.prototype.valueOf = function () {
      return this._val;
    };

    Date.prototype.toString = function () {
      return this._moment().format('YYYY-MM-DD HH:mm Z');
    };

    Date.prototype.toJSON = function () {
      return this._val;
    };

    return Date;
  };
});