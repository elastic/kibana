define(function (require) {

  // create a property descriptor for properties
  // that won't change
  function describeConst(val) {
    return {
      writable: false,
      enumerable: false,
      configurable: false,
      value: val
    };
  }

  /**
   * Property descriptors for methods that will be written to every function/constructor
   * that is passed to _.class()
   *
   * @type {propertiesDescriptor}
   */
  return {
    inherits: describeConst(function (SuperClass) {
      var prototype = Object.create(SuperClass.prototype, {
        constructor: describeConst(this),
        superConstructor: describeConst(SuperClass)
      });

      Object.defineProperties(this, {
        prototype: describeConst(prototype),
        Super: describeConst(SuperClass)
      });

      return this;
    })
  };
});
