define(function (require) {
  return function GeoShapeFieldType(Private) {
    var Abstract = Private(require('./_abstract'));

    function GeoShape(val) {
      // TODO: add literal support for GeoShapess
      this._val = val;
    }

    Abstract.extend(GeoShape);

    return GeoShape;
  };
});