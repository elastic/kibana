/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

export function ObjDefine(defaults, prototype) {
  this.obj; // created by this.create()

  this.descs = {};
  this.defaults = defaults || {};
  this.prototype = prototype || Object.prototype;
}

ObjDefine.REDEFINE_SUPPORTED = (function () {
  const a = Object.create(Object.prototype, {
    prop: {
      configurable: true,
      value: 1,
    },
  });

  Object.defineProperty(a, 'prop', {
    configurable: true,
    value: 2,
  });

  return a.prop === 2;
})();

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
 * computed fact, not exported or changeable
 *
 * @param  {any} v - value
 * @return {object} - property descriptor
 */
ObjDefine.prototype.comp = function (name, val) {
  this._define(name, val);
};

/**
 * Creates an object, decorated by the property descriptors
 * created by other ObjDefine methods and inheriting form the
 * prototype
 *
 * # note:
 * If a value is writable, but the value is undefined, the property will
 * be created by not exported to JSON unless the property is written to
 *
 * @return {object} - created object
 */
ObjDefine.prototype.create = function () {
  const self = this;
  self.obj = Object.create(this.prototype, self.descs);

  if (!ObjDefine.REDEFINE_SUPPORTED && !self.prototype.toJSON) {
    // since we can't redefine properties as enumerable we will
    // clone the object on serialization and choose which properties
    // to include or trim manually. This is currently only in use in PhantomJS
    // due to https://github.com/ariya/phantomjs/issues/11856
    // TODO: remove this: https://github.com/elastic/kibana/issues/27136
    self.obj.toJSON = function () {
      return _.transform(
        self.obj,
        function (json, val, key) {
          const desc = self.descs[key];
          if (desc && desc.enumerable && val == null) return;
          json[key] = val;
        },
        {}
      );
    };
  }

  return self.obj;
};

/**
 * Private APIS
 */

ObjDefine.prototype._define = function (name, val, exported, changeable) {
  val = val != null ? val : this.defaults[name];
  this.descs[name] = this._describe(name, val, !!exported, !!changeable);
};

ObjDefine.prototype._describe = function (name, val, exported, changeable) {
  const self = this;
  const exists = val != null;

  if (exported && ObjDefine.REDEFINE_SUPPORTED) {
    return {
      enumerable: exists,
      configurable: true,
      get: _.constant(val),
      set: function (update) {
        if (!changeable) return false;

        // change the descriptor, since the value now exists.
        self.descs[name] = self._describe(name, update, exported, changeable);

        // apply the updated descriptor
        Object.defineProperty(self.obj, name, self.descs[name]);
      },
    };
  }

  if (exported && !ObjDefine.REDEFINE_SUPPORTED) {
    return {
      enumerable: true,
      configurable: true,
      writable: changeable,
      value: val,
    };
  }

  return {
    enumerable: false,
    writable: changeable,
    configurable: true,
    value: val,
  };
};
