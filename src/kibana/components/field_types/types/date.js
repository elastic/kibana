define(function (require) {
  return function DateFieldType() {
    var moment = require('moment');
    return function (val) {
      return moment(val);
    };
  };
});