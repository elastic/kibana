define(function (require) {
  return function GeoPointFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function GeoPoint(val) {
      // TODO: add literal support for GeoPointss
      this._val = val;
    }

    Abstract.extend(GeoPoint);

    return GeoPoint;
  };
});