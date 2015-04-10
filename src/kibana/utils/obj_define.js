define(function (require) {
  var _ = require('lodash');

  function ObjDefine(defaults, prototype) {
    this.obj; // created by this.create()

    this.descs = {};
    this.defaults = defaults || {};
    this.prototype = prototype || Object.prototype;
  }

  /**
   * normal value, writable and exported in JSON
   *
   * @param  {any} v - value
   * @return {object} - property descriptor
   */
  ObjDefine.prototype.writ = function (name, val) {
    this._define(name, val, true, true);
  };

  /**
   * known value, exported in JSON, not changeable
   *
   * @param  {any} v - value
   * @return {object} - property descriptor
   */
  ObjDefine.prototype.fact = function (name, val) {
    this._define(name, val, true);
  };

  /**
   * calculated fact, not exported or changeable
   *
   * @param  {any} v - value
   * @return {object} - property descriptor
   */
  ObjDefine.prototype.flag = function (name, val) {
    this._define(name, val);
  };

  /**
   * Creates an object, decorated by the property descriptors
   * created by other ObjDefine methods and inheritting form the
   * prototype
   *
   * # note:
   * If a value is writable, but the value is undefined, the property will
   * be created by not exported to JSON unless the property is written to
   *
   * @return {object} - created object
   */
  ObjDefine.prototype.create = function () {
    return this.obj = Object.create(this.prototype, this.descs);
  };


  /**
   * Private APIS
   */

  ObjDefine.prototype._define = function (name, val, exported, changeable) {
    val = val != null ? val : this.defaults[name];
    this.descs[name] = this._describe(name, val, !!exported, !!changeable);
  };

  ObjDefine.prototype._describe = function (name, val, exported, changeable) {
    var self = this;
    var exists = val != null;

    if (exported) {
      return {
        enumerable: exists,
        configurable: true,
        get: _.constant(val),
        set: function (update) {
          if (!changeable) return false;

          // redefine the property to reflect changes
          Object.defineProperty(
            self.obj,
            name,
            self._describe(name, update, exported, changeable)
          );
        }
      };
    }

    return {
      enumerable: false,
      writable: changeable,
      value: val
    };
  };

  return ObjDefine;
});
