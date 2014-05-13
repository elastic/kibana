define(function (require) {
  return function NumberFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function Number(val) {
      this._val = val;
    }

    Abstract.extend(Number);

    return Number;
  };
});