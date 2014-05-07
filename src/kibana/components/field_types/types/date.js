define(function (require) {
  return function DateFieldType(Private) {
    var Abstract = Private(require('./_abstract'));
    var moment = require('moment');

    function Date(val) {
      this._val = moment(val);
    }

    Abstract.extend(Date);

    return Date;
  };
});