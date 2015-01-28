define(function (require) {
  var _ = require('lodash');

  function ObjWrap(obj) {
    this.descs = {};
    this.obj = obj;
    this.wrapper; // created by this.create()
  }

  /**
   * normal value, writable and saved to ES
   *
   * @param  {any} v - value
   * @return {object} - property descriptor
   */
  ObjWrap.prototype.writ = function (name, val) {
    this._define(name, val, true, true);
  };

  /**
   * known value, saved to ES, not changeable
   *
   * @param  {any} v - value
   * @return {object} - property descriptor
   */
  ObjWrap.prototype.fact = function (name, val) {
    this._define(name, val, true);
  };

  /**
   * conditional value, based on facts, not saved or changeable
   *
   * @param  {any} v - value
   * @return {object} - property descriptor
   */
  ObjWrap.prototype.flag = function (name, val) {
    this._define(name, val);
  };

  /**
   * Creates a field object, based on the list of property descriptors,
   * which slightly modifies the descriptors created by fieldSetup() so that
   * properties that we want to save in normal circumstances, but aren't set
   * on the field spec, are changed to unsaved. If the value is writable, then
   * the value will be transformed into a saved value on write.
   *
   * @param  {object} spec - the field spec, comed from transformMappingIntoField or ES
   * @param  {object} props - map of property descriptors http://goo.gl/FC8kWq
   * @return {object} - field object
   */
  ObjWrap.prototype.create = function () {
    return this.wrapper = Object.create(Object.prototype, this.descs);
  };


  /**
   * Private APIS
   */

  ObjWrap.prototype._define = function (name, val, saved, change) {
    val = val == null ? this.obj[name] : val;
    this.descs[name] = this._describe(name, val, saved, change);
  };

  ObjWrap.prototype._describe = function (name, val, saved, change) {
    var self = this;
    var has = _.has(this.obj, name);
    change = !!change;
    saved = !!saved;

    if (saved && has) {
      return { enumerable: true, writable: change, value: val };
    }

    if (saved && !has) {
      return {
        enumerable: false,
        get: _.constant(val),
        set: function (update) {
          // redefine the property as normal/writable
          Object.defineProperty(self.wrapper, name, {
            enumerable: true,
            writable: true,
            value: update
          });
        }
      };
    }

    return {
      enumerable: false,
      writable: change,
      value: val
    };
  };

  return ObjWrap;
});
