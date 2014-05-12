define(function (require) {
  return function DateFieldType(Private) {
    var Abstract = Private(require('./_abstract'));
    var moment = require('moment');

    function Date(val) {
      this._val = moment(val);
    }

    Abstract.extend(Date);

    Date.prototype.valueOf = function () {
      return this._val.valueOf();
    };

    Date.prototype.toString = function () {
      return this._val.format('YYYY-MM-DD HH:mm Z');
    };

    Date.prototype.toJSON = function () {
      return this.valueOf();
    };

    return Date;
  };
});