define(function (require) {
  return function BooleanFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function Boolean(val) {
      this._val = !!val;
    }

    Abstract.extend(Boolean);

    return Boolean;
  };
});