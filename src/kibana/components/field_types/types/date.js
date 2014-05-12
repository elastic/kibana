define(function (require) {
  return function DateFieldType(Private) {
    var Abstract = Private(require('./_abstract'));
    var moment = require('moment');

    function KbnDate(val) {
      this._val = val;
    }

    Abstract.extend(KbnDate);

    KbnDate.prototype._moment = function () {
      // lazy eval the moment object
      return this._m || (this._m = moment(this._val)).zone(0);
    };

    KbnDate.prototype.toString = function () {
      // eval and cache the string version of this date
      return this._s || (this._s = this._moment().format('MM-DD-YYYY HH:mm'));
    };

    KbnDate.prototype.toJSON = function () {
      return this._val;
    };

    return KbnDate;
  };
});