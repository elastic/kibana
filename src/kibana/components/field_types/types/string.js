define(function (require) {
  return function StringFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function String(val) {
      this._val = val;
    }

    Abstract.extend(String);

    return String;
  };
});