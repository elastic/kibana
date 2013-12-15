"no use strict";

var console = {
  log: function () {
    var msgs = Array.prototype.slice.call(arguments, 0);
    postMessage({type: "log", data: msgs});
  },
  error: function () {
    var msgs = Array.prototype.slice.call(arguments, 0);
    postMessage({type: "log", data: msgs});
  }
};
var window = {
  console: console
};

var normalizeModule = function (parentId, moduleName) {
  // normalize plugin requires
  if (moduleName.indexOf("!") !== -1) {
    var chunks = moduleName.split("!");
    return normalizeModule(parentId, chunks[0]) + "!" + normalizeModule(parentId, chunks[1]);
  }
  // normalize relative requires
  if (moduleName.charAt(0) == ".") {
    var base = parentId.split("/").slice(0, -1).join("/");
    var moduleName = base + "/" + moduleName;

    while (moduleName.indexOf(".") !== -1 && previous != moduleName) {
      var previous = moduleName;
      var moduleName = moduleName.replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
    }
  }

  return moduleName;
};

var require = function (parentId, id) {
  if (!id.charAt)
    throw new Error("worker.js require() accepts only (parentId, id) as arguments");

  var id = normalizeModule(parentId, id);

  var module = require.modules[id];
  if (module) {
    if (!module.initialized) {
      module.initialized = true;
      module.exports = module.factory().exports;
    }
    return module.exports;
  }

  var chunks = id.split("/");
  chunks[0] = require.tlns[chunks[0]] || chunks[0];
  var path = chunks.join("/") + ".js";

  require.id = id;
  importScripts(path);
  return require(parentId, id);
};

require.modules = {};
require.tlns = {};

var define = function (id, deps, factory) {
  if (arguments.length == 2) {
    factory = deps;
    if (typeof id != "string") {
      deps = id;
      id = require.id;
    }
  } else if (arguments.length == 1) {
    factory = id;
    id = require.id;
  }

  if (id.indexOf("text!") === 0)
    return;

  var req = function (deps, factory) {
    return require(id, deps, factory);
  };

  require.modules[id] = {
    factory: function () {
      var module = {
        exports: {}
      };
      var returnExports = factory(req, module.exports, module);
      if (returnExports)
        module.exports = returnExports;
      return module;
    }
  };
};

function initBaseUrls(topLevelNamespaces) {
  require.tlns = topLevelNamespaces;
}

function initSender() {

  var EventEmitter = require(null, "ace/lib/event_emitter").EventEmitter;
  var oop = require(null, "ace/lib/oop");

  var Sender = function () {
  };

  (function () {

    oop.implement(this, EventEmitter);

    this.callback = function (data, callbackId) {
      postMessage({
        type: "call",
        id: callbackId,
        data: data
      });
    };

    this.emit = function (name, data) {
      postMessage({
        type: "event",
        name: name,
        data: data
      });
    };

  }).call(Sender.prototype);

  return new Sender();
}

var main;
var sender;

onmessage = function (e) {
  var msg = e.data;
  if (msg.command) {
    if (main[msg.command])
      main[msg.command].apply(main, msg.args);
    else
      throw new Error("Unknown command:" + msg.command);
  }
  else if (msg.init) {
    initBaseUrls(msg.tlns);
    require(null, "ace/lib/fixoldbrowsers");
    sender = initSender();
    var clazz = require(null, msg.module)[msg.classname];
    main = new clazz(sender);
  }
  else if (msg.event && sender) {
    sender._emit(msg.event, msg.data);
  }
};
// vim:set ts=4 sts=4 sw=4 st:

define('ace/lib/fixoldbrowsers', ['require', 'exports', 'module' , 'ace/lib/regexp', 'ace/lib/es5-shim'], function (require, exports, module) {


  require("./regexp");
  require("./es5-shim");

});

define('ace/lib/regexp', ['require', 'exports', 'module' ], function (require, exports, module) {

  var real = {
      exec: RegExp.prototype.exec,
      test: RegExp.prototype.test,
      match: String.prototype.match,
      replace: String.prototype.replace,
      split: String.prototype.split
    },
    compliantExecNpcg = real.exec.call(/()??/, "")[1] === undefined, // check `exec` handling of nonparticipating capturing groups
    compliantLastIndexIncrement = function () {
      var x = /^/g;
      real.test.call(x, "");
      return !x.lastIndex;
    }();

  if (compliantLastIndexIncrement && compliantExecNpcg)
    return;
  RegExp.prototype.exec = function (str) {
    var match = real.exec.apply(this, arguments),
      name, r2;
    if (typeof(str) == 'string' && match) {
      if (!compliantExecNpcg && match.length > 1 && indexOf(match, "") > -1) {
        r2 = RegExp(this.source, real.replace.call(getNativeFlags(this), "g", ""));
        real.replace.call(str.slice(match.index), r2, function () {
          for (var i = 1; i < arguments.length - 2; i++) {
            if (arguments[i] === undefined)
              match[i] = undefined;
          }
        });
      }
      if (this._xregexp && this._xregexp.captureNames) {
        for (var i = 1; i < match.length; i++) {
          name = this._xregexp.captureNames[i - 1];
          if (name)
            match[name] = match[i];
        }
      }
      if (!compliantLastIndexIncrement && this.global && !match[0].length && (this.lastIndex > match.index))
        this.lastIndex--;
    }
    return match;
  };
  if (!compliantLastIndexIncrement) {
    RegExp.prototype.test = function (str) {
      var match = real.exec.call(this, str);
      if (match && this.global && !match[0].length && (this.lastIndex > match.index))
        this.lastIndex--;
      return !!match;
    };
  }

  function getNativeFlags(regex) {
    return (regex.global ? "g" : "") +
      (regex.ignoreCase ? "i" : "") +
      (regex.multiline ? "m" : "") +
      (regex.extended ? "x" : "") + // Proposed for ES4; included in AS3
      (regex.sticky ? "y" : "");
  }

  function indexOf(array, item, from) {
    if (Array.prototype.indexOf) // Use the native array method if available
      return array.indexOf(item, from);
    for (var i = from || 0; i < array.length; i++) {
      if (array[i] === item)
        return i;
    }
    return -1;
  }

});

define('ace/lib/es5-shim', ['require', 'exports', 'module' ], function (require, exports, module) {

  if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(that) { // .length is 1
      var target = this;
      if (typeof target != "function")
        throw new TypeError(); // TODO message
      var args = slice.call(arguments, 1); // for normal call
      var bound = function () {

        if (this instanceof bound) {

          var F = function () {
          };
          F.prototype = target.prototype;
          var self = new F;

          var result = target.apply(
            self,
            args.concat(slice.call(arguments))
          );
          if (result !== null && Object(result) === result)
            return result;
          return self;

        } else {
          return target.apply(
            that,
            args.concat(slice.call(arguments))
          );

        }

      };
      return bound;
    };
  }
  var call = Function.prototype.call;
  var prototypeOfArray = Array.prototype;
  var prototypeOfObject = Object.prototype;
  var slice = prototypeOfArray.slice;
  var toString = call.bind(prototypeOfObject.toString);
  var owns = call.bind(prototypeOfObject.hasOwnProperty);
  var defineGetter;
  var defineSetter;
  var lookupGetter;
  var lookupSetter;
  var supportsAccessors;
  if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
  }
  if (!Array.isArray) {
    Array.isArray = function isArray(obj) {
      return toString(obj) == "[object Array]";
    };
  }
  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(fun /*, thisp*/) {
      var self = toObject(this),
        thisp = arguments[1],
        i = 0,
        length = self.length >>> 0;
      if (toString(fun) != "[object Function]") {
        throw new TypeError(); // TODO message
      }

      while (i < length) {
        if (i in self) {
          fun.call(thisp, self[i], i, self);
        }
        i++;
      }
    };
  }
  if (!Array.prototype.map) {
    Array.prototype.map = function map(fun /*, thisp*/) {
      var self = toObject(this),
        length = self.length >>> 0,
        result = Array(length),
        thisp = arguments[1];
      if (toString(fun) != "[object Function]") {
        throw new TypeError(); // TODO message
      }

      for (var i = 0; i < length; i++) {
        if (i in self)
          result[i] = fun.call(thisp, self[i], i, self);
      }
      return result;
    };
  }
  if (!Array.prototype.filter) {
    Array.prototype.filter = function filter(fun /*, thisp */) {
      var self = toObject(this),
        length = self.length >>> 0,
        result = [],
        thisp = arguments[1];
      if (toString(fun) != "[object Function]") {
        throw new TypeError(); // TODO message
      }

      for (var i = 0; i < length; i++) {
        if (i in self && fun.call(thisp, self[i], i, self))
          result.push(self[i]);
      }
      return result;
    };
  }
  if (!Array.prototype.every) {
    Array.prototype.every = function every(fun /*, thisp */) {
      var self = toObject(this),
        length = self.length >>> 0,
        thisp = arguments[1];
      if (toString(fun) != "[object Function]") {
        throw new TypeError(); // TODO message
      }

      for (var i = 0; i < length; i++) {
        if (i in self && !fun.call(thisp, self[i], i, self))
          return false;
      }
      return true;
    };
  }
  if (!Array.prototype.some) {
    Array.prototype.some = function some(fun /*, thisp */) {
      var self = toObject(this),
        length = self.length >>> 0,
        thisp = arguments[1];
      if (toString(fun) != "[object Function]") {
        throw new TypeError(); // TODO message
      }

      for (var i = 0; i < length; i++) {
        if (i in self && fun.call(thisp, self[i], i, self))
          return true;
      }
      return false;
    };
  }
  if (!Array.prototype.reduce) {
    Array.prototype.reduce = function reduce(fun /*, initial*/) {
      var self = toObject(this),
        length = self.length >>> 0;
      if (toString(fun) != "[object Function]") {
        throw new TypeError(); // TODO message
      }
      if (!length && arguments.length == 1)
        throw new TypeError(); // TODO message

      var i = 0;
      var result;
      if (arguments.length >= 2) {
        result = arguments[1];
      } else {
        do {
          if (i in self) {
            result = self[i++];
            break;
          }
          if (++i >= length)
            throw new TypeError(); // TODO message
        } while (true);
      }

      for (; i < length; i++) {
        if (i in self)
          result = fun.call(void 0, result, self[i], i, self);
      }

      return result;
    };
  }
  if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
      var self = toObject(this),
        length = self.length >>> 0;
      if (toString(fun) != "[object Function]") {
        throw new TypeError(); // TODO message
      }
      if (!length && arguments.length == 1)
        throw new TypeError(); // TODO message

      var result, i = length - 1;
      if (arguments.length >= 2) {
        result = arguments[1];
      } else {
        do {
          if (i in self) {
            result = self[i--];
            break;
          }
          if (--i < 0)
            throw new TypeError(); // TODO message
        } while (true);
      }

      do {
        if (i in this)
          result = fun.call(void 0, result, self[i], i, self);
      } while (i--);

      return result;
    };
  }
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function indexOf(sought /*, fromIndex */) {
      var self = toObject(this),
        length = self.length >>> 0;

      if (!length)
        return -1;

      var i = 0;
      if (arguments.length > 1)
        i = toInteger(arguments[1]);
      i = i >= 0 ? i : Math.max(0, length + i);
      for (; i < length; i++) {
        if (i in self && self[i] === sought) {
          return i;
        }
      }
      return -1;
    };
  }
  if (!Array.prototype.lastIndexOf) {
    Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
      var self = toObject(this),
        length = self.length >>> 0;

      if (!length)
        return -1;
      var i = length - 1;
      if (arguments.length > 1)
        i = Math.min(i, toInteger(arguments[1]));
      i = i >= 0 ? i : length - Math.abs(i);
      for (; i >= 0; i--) {
        if (i in self && sought === self[i])
          return i;
      }
      return -1;
    };
  }
  if (!Object.getPrototypeOf) {
    Object.getPrototypeOf = function getPrototypeOf(object) {
      return object.__proto__ || (
        object.constructor ?
          object.constructor.prototype :
          prototypeOfObject
        );
    };
  }
  if (!Object.getOwnPropertyDescriptor) {
    var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a " +
      "non-object: ";
    Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
      if ((typeof object != "object" && typeof object != "function") || object === null)
        throw new TypeError(ERR_NON_OBJECT + object);
      if (!owns(object, property))
        return;

      var descriptor, getter, setter;
      descriptor = { enumerable: true, configurable: true };
      if (supportsAccessors) {
        var prototype = object.__proto__;
        object.__proto__ = prototypeOfObject;

        var getter = lookupGetter(object, property);
        var setter = lookupSetter(object, property);
        object.__proto__ = prototype;

        if (getter || setter) {
          if (getter) descriptor.get = getter;
          if (setter) descriptor.set = setter;
          return descriptor;
        }
      }
      descriptor.value = object[property];
      return descriptor;
    };
  }
  if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
      return Object.keys(object);
    };
  }
  if (!Object.create) {
    var createEmpty;
    if (Object.prototype.__proto__ === null) {
      createEmpty = function () {
        return { "__proto__": null };
      };
    } else {
      createEmpty = function () {
        var empty = {};
        for (var i in empty)
          empty[i] = null;
        empty.constructor =
          empty.hasOwnProperty =
            empty.propertyIsEnumerable =
              empty.isPrototypeOf =
                empty.toLocaleString =
                  empty.toString =
                    empty.valueOf =
                      empty.__proto__ = null;
        return empty;
      }
    }

    Object.create = function create(prototype, properties) {
      var object;
      if (prototype === null) {
        object = createEmpty();
      } else {
        if (typeof prototype != "object")
          throw new TypeError("typeof prototype[" + (typeof prototype) + "] != 'object'");
        var Type = function () {
        };
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
      }
      if (properties !== void 0)
        Object.defineProperties(object, properties);
      return object;
    };
  }

  function doesDefinePropertyWork(object) {
    try {
      Object.defineProperty(object, "sentinel", {});
      return "sentinel" in object;
    } catch (exception) {
    }
  }

  if (Object.defineProperty) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document == "undefined" ||
      doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
      var definePropertyFallback = Object.defineProperty;
    }
  }

  if (!Object.defineProperty || definePropertyFallback) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
      "on this javascript engine";

    Object.defineProperty = function defineProperty(object, property, descriptor) {
      if ((typeof object != "object" && typeof object != "function") || object === null)
        throw new TypeError(ERR_NON_OBJECT_TARGET + object);
      if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null)
        throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
      if (definePropertyFallback) {
        try {
          return definePropertyFallback.call(Object, object, property, descriptor);
        } catch (exception) {
        }
      }
      if (owns(descriptor, "value")) {

        if (supportsAccessors && (lookupGetter(object, property) ||
          lookupSetter(object, property))) {
          var prototype = object.__proto__;
          object.__proto__ = prototypeOfObject;
          delete object[property];
          object[property] = descriptor.value;
          object.__proto__ = prototype;
        } else {
          object[property] = descriptor.value;
        }
      } else {
        if (!supportsAccessors)
          throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
        if (owns(descriptor, "get"))
          defineGetter(object, property, descriptor.get);
        if (owns(descriptor, "set"))
          defineSetter(object, property, descriptor.set);
      }

      return object;
    };
  }
  if (!Object.defineProperties) {
    Object.defineProperties = function defineProperties(object, properties) {
      for (var property in properties) {
        if (owns(properties, property))
          Object.defineProperty(object, property, properties[property]);
      }
      return object;
    };
  }
  if (!Object.seal) {
    Object.seal = function seal(object) {
      return object;
    };
  }
  if (!Object.freeze) {
    Object.freeze = function freeze(object) {
      return object;
    };
  }
  try {
    Object.freeze(function () {
    });
  } catch (exception) {
    Object.freeze = (function freeze(freezeObject) {
      return function freeze(object) {
        if (typeof object == "function") {
          return object;
        } else {
          return freezeObject(object);
        }
      };
    })(Object.freeze);
  }
  if (!Object.preventExtensions) {
    Object.preventExtensions = function preventExtensions(object) {
      return object;
    };
  }
  if (!Object.isSealed) {
    Object.isSealed = function isSealed(object) {
      return false;
    };
  }
  if (!Object.isFrozen) {
    Object.isFrozen = function isFrozen(object) {
      return false;
    };
  }
  if (!Object.isExtensible) {
    Object.isExtensible = function isExtensible(object) {
      if (Object(object) === object) {
        throw new TypeError(); // TODO message
      }
      var name = '';
      while (owns(object, name)) {
        name += '?';
      }
      object[name] = true;
      var returnValue = owns(object, name);
      delete object[name];
      return returnValue;
    };
  }
  if (!Object.keys) {
    var hasDontEnumBug = true,
      dontEnums = [
        "toString",
        "toLocaleString",
        "valueOf",
        "hasOwnProperty",
        "isPrototypeOf",
        "propertyIsEnumerable",
        "constructor"
      ],
      dontEnumsLength = dontEnums.length;

    for (var key in {"toString": null})
      hasDontEnumBug = false;

    Object.keys = function keys(object) {

      if ((typeof object != "object" && typeof object != "function") || object === null)
        throw new TypeError("Object.keys called on a non-object");

      var keys = [];
      for (var name in object) {
        if (owns(object, name)) {
          keys.push(name);
        }
      }

      if (hasDontEnumBug) {
        for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
          var dontEnum = dontEnums[i];
          if (owns(object, dontEnum)) {
            keys.push(dontEnum);
          }
        }
      }

      return keys;
    };

  }
  if (!Date.prototype.toISOString || (new Date(-62198755200000).toISOString().indexOf('-000001') === -1)) {
    Date.prototype.toISOString = function toISOString() {
      var result, length, value, year;
      if (!isFinite(this))
        throw new RangeError;
      result = [this.getUTCMonth() + 1, this.getUTCDate(),
        this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()];
      year = this.getUTCFullYear();
      year = (year < 0 ? '-' : (year > 9999 ? '+' : '')) + ('00000' + Math.abs(year)).slice(0 <= year && year <= 9999 ? -4 : -6);

      length = result.length;
      while (length--) {
        value = result[length];
        if (value < 10)
          result[length] = "0" + value;
      }
      return year + "-" + result.slice(0, 2).join("-") + "T" + result.slice(2).join(":") + "." +
        ("000" + this.getUTCMilliseconds()).slice(-3) + "Z";
    }
  }
  if (!Date.now) {
    Date.now = function now() {
      return new Date().getTime();
    };
  }
  if (!Date.prototype.toJSON) {
    Date.prototype.toJSON = function toJSON(key) {
      if (typeof this.toISOString != "function")
        throw new TypeError(); // TODO message
      return this.toISOString();
    };
  }
  if (Date.parse("+275760-09-13T00:00:00.000Z") !== 8.64e15) {
    Date = (function (NativeDate) {
      var Date = function Date(Y, M, D, h, m, s, ms) {
        var length = arguments.length;
        if (this instanceof NativeDate) {
          var date = length == 1 && String(Y) === Y ? // isString(Y)
            new NativeDate(Date.parse(Y)) :
            length >= 7 ? new NativeDate(Y, M, D, h, m, s, ms) :
              length >= 6 ? new NativeDate(Y, M, D, h, m, s) :
                length >= 5 ? new NativeDate(Y, M, D, h, m) :
                  length >= 4 ? new NativeDate(Y, M, D, h) :
                    length >= 3 ? new NativeDate(Y, M, D) :
                      length >= 2 ? new NativeDate(Y, M) :
                        length >= 1 ? new NativeDate(Y) :
                          new NativeDate();
          date.constructor = Date;
          return date;
        }
        return NativeDate.apply(this, arguments);
      };
      var isoDateExpression = new RegExp("^" +
        "(\\d{4}|[\+\-]\\d{6})" + // four-digit year capture or sign + 6-digit extended year
        "(?:-(\\d{2})" + // optional month capture
        "(?:-(\\d{2})" + // optional day capture
        "(?:" + // capture hours:minutes:seconds.milliseconds
        "T(\\d{2})" + // hours capture
        ":(\\d{2})" + // minutes capture
        "(?:" + // optional :seconds.milliseconds
        ":(\\d{2})" + // seconds capture
        "(?:\\.(\\d{3}))?" + // milliseconds capture
        ")?" +
        "(?:" + // capture UTC offset component
        "Z|" + // UTC capture
        "(?:" + // offset specifier +/-hours:minutes
        "([-+])" + // sign capture
        "(\\d{2})" + // hours offset capture
        ":(\\d{2})" + // minutes offset capture
        ")" +
        ")?)?)?)?" +
        "$");
      for (var key in NativeDate)
        Date[key] = NativeDate[key];
      Date.now = NativeDate.now;
      Date.UTC = NativeDate.UTC;
      Date.prototype = NativeDate.prototype;
      Date.prototype.constructor = Date;
      Date.parse = function parse(string) {
        var match = isoDateExpression.exec(string);
        if (match) {
          match.shift(); // kill match[0], the full match
          for (var i = 1; i < 7; i++) {
            match[i] = +(match[i] || (i < 3 ? 1 : 0));
            if (i == 1)
              match[i]--;
          }
          var minuteOffset = +match.pop(), hourOffset = +match.pop(), sign = match.pop();
          var offset = 0;
          if (sign) {
            if (hourOffset > 23 || minuteOffset > 59)
              return NaN;
            offset = (hourOffset * 60 + minuteOffset) * 6e4 * (sign == "+" ? -1 : 1);
          }
          var year = +match[0];
          if (0 <= year && year <= 99) {
            match[0] = year + 400;
            return NativeDate.UTC.apply(this, match) + offset - 12622780800000;
          }
          return NativeDate.UTC.apply(this, match) + offset;
        }
        return NativeDate.parse.apply(this, arguments);
      };

      return Date;
    })(Date);
  }
  var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
    "\u2029\uFEFF";
  if (!String.prototype.trim || ws.trim()) {
    ws = "[" + ws + "]";
    var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
      trimEndRegexp = new RegExp(ws + ws + "*$");
    String.prototype.trim = function trim() {
      return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
    };
  }
  var toInteger = function (n) {
    n = +n;
    if (n !== n) // isNaN
      n = 0;
    else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
      n = (n > 0 || -1) * Math.floor(Math.abs(n));
    return n;
  };

  var prepareString = "a"[0] != "a",
    toObject = function (o) {
      if (o == null) { // this matches both null and undefined
        throw new TypeError(); // TODO message
      }
      if (prepareString && typeof o == "string" && o) {
        return o.split("");
      }
      return Object(o);
    };
});

define('ace/lib/event_emitter', ['require', 'exports', 'module' ], function (require, exports, module) {


  var EventEmitter = {};

  EventEmitter._emit =
    EventEmitter._dispatchEvent = function (eventName, e) {
      this._eventRegistry = this._eventRegistry || {};
      this._defaultHandlers = this._defaultHandlers || {};

      var listeners = this._eventRegistry[eventName] || [];
      var defaultHandler = this._defaultHandlers[eventName];
      if (!listeners.length && !defaultHandler)
        return;

      if (typeof e != "object" || !e)
        e = {};

      if (!e.type)
        e.type = eventName;

      if (!e.stopPropagation) {
        e.stopPropagation = function () {
          this.propagationStopped = true;
        };
      }

      if (!e.preventDefault) {
        e.preventDefault = function () {
          this.defaultPrevented = true;
        };
      }

      for (var i = 0; i < listeners.length; i++) {
        listeners[i](e);
        if (e.propagationStopped)
          break;
      }

      if (defaultHandler && !e.defaultPrevented)
        return defaultHandler(e);
    };

  EventEmitter.setDefaultHandler = function (eventName, callback) {
    this._defaultHandlers = this._defaultHandlers || {};

    if (this._defaultHandlers[eventName])
      throw new Error("The default handler for '" + eventName + "' is already set");

    this._defaultHandlers[eventName] = callback;
  };

  EventEmitter.on =
    EventEmitter.addEventListener = function (eventName, callback) {
      this._eventRegistry = this._eventRegistry || {};

      var listeners = this._eventRegistry[eventName];
      if (!listeners)
        listeners = this._eventRegistry[eventName] = [];

      if (listeners.indexOf(callback) == -1)
        listeners.push(callback);
    };

  EventEmitter.removeListener =
    EventEmitter.removeEventListener = function (eventName, callback) {
      this._eventRegistry = this._eventRegistry || {};

      var listeners = this._eventRegistry[eventName];
      if (!listeners)
        return;

      var index = listeners.indexOf(callback);
      if (index !== -1)
        listeners.splice(index, 1);
    };

  EventEmitter.removeAllListeners = function (eventName) {
    if (this._eventRegistry) this._eventRegistry[eventName] = [];
  };

  exports.EventEmitter = EventEmitter;

});

define('ace/lib/oop', ['require', 'exports', 'module' ], function (require, exports, module) {


  exports.inherits = (function () {
    var tempCtor = function () {
    };
    return function (ctor, superCtor) {
      tempCtor.prototype = superCtor.prototype;
      ctor.super_ = superCtor.prototype;
      ctor.prototype = new tempCtor();
      ctor.prototype.constructor = ctor;
    };
  }());

  exports.mixin = function (obj, mixin) {
    for (var key in mixin) {
      obj[key] = mixin[key];
    }
  };

  exports.implement = function (proto, mixin) {
    exports.mixin(proto, mixin);
  };

});

define('ace/mode/sense_worker', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/worker/mirror', 'ace/mode/sense/sense_parse'], function (require, exports, module) {


  var oop = require("../lib/oop");
  var Mirror = require("../worker/mirror").Mirror;
  var parse = require("./sense/sense_parse");

  var SenseWorker = exports.SenseWorker = function (sender) {
    Mirror.call(this, sender);
    this.setTimeout(200);
  };

  oop.inherits(SenseWorker, Mirror);

  (function () {

    this.onUpdate = function () {
      var value = this.doc.getValue();
      var pos;
      try {
        var result = parse(value);
      } catch (e) {
        pos = this.charToDocumentPosition(e.at - 1);
        this.sender.emit("error", {
          row: pos.row,
          column: pos.column,
          text: e.message,
          type: "error"
        });
        return;
      }
      for (var i = 0; i < result.annotations.length; i++) {
        pos = this.charToDocumentPosition(result.annotations[i].at - 1);
        result.annotations[i].row = pos.row;
        result.annotations[i].column = pos.column;

      }
      this.sender.emit("ok", result.annotations);
    };

    this.charToDocumentPosition = function (charPos) {
      var i = 0;
      var len = this.doc.getLength();
      var nl = this.doc.getNewLineCharacter().length;

      if (!len) {
        return { row: 0, column: 0};
      }

      var lineStart = 0;
      while (i < len) {
        var line = this.doc.getLine(i);
        var lineLength = line.length + nl;
        if (lineStart + lineLength > charPos)
          return {
            row: i,
            column: charPos - lineStart
          };

        lineStart += lineLength;
        i += 1;
      }

      return {
        row: i - 1,
        column: line.length
      };
    };

  }).call(SenseWorker.prototype);

});
define('ace/worker/mirror', ['require', 'exports', 'module' , 'ace/document', 'ace/lib/lang'], function (require, exports, module) {


  var Document = require("../document").Document;
  var lang = require("../lib/lang");

  var Mirror = exports.Mirror = function (sender) {
    this.sender = sender;
    var doc = this.doc = new Document("");

    var deferredUpdate = this.deferredUpdate = lang.deferredCall(this.onUpdate.bind(this));

    var _self = this;
    sender.on("change", function (e) {
      doc.applyDeltas([e.data]);
      deferredUpdate.schedule(_self.$timeout);
    });
  };

  (function () {

    this.$timeout = 500;

    this.setTimeout = function (timeout) {
      this.$timeout = timeout;
    };

    this.setValue = function (value) {
      this.doc.setValue(value);
      this.deferredUpdate.schedule(this.$timeout);
    };

    this.getValue = function (callbackId) {
      this.sender.callback(this.doc.getValue(), callbackId);
    };

    this.onUpdate = function () {
    };

  }).call(Mirror.prototype);

});

define('ace/document', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/lib/event_emitter', 'ace/range', 'ace/anchor'], function (require, exports, module) {


  var oop = require("./lib/oop");
  var EventEmitter = require("./lib/event_emitter").EventEmitter;
  var Range = require("./range").Range;
  var Anchor = require("./anchor").Anchor;

  var Document = function (text) {
    this.$lines = [];
    if (text.length == 0) {
      this.$lines = [""];
    } else if (Array.isArray(text)) {
      this.insertLines(0, text);
    } else {
      this.insert({row: 0, column: 0}, text);
    }
  };

  (function () {

    oop.implement(this, EventEmitter);
    this.setValue = function (text) {
      var len = this.getLength();
      this.remove(new Range(0, 0, len, this.getLine(len - 1).length));
      this.insert({row: 0, column: 0}, text);
    };
    this.getValue = function () {
      return this.getAllLines().join(this.getNewLineCharacter());
    };
    this.createAnchor = function (row, column) {
      return new Anchor(this, row, column);
    };
    if ("aaa".split(/a/).length == 0)
      this.$split = function (text) {
        return text.replace(/\r\n|\r/g, "\n").split("\n");
      }
    else
      this.$split = function (text) {
        return text.split(/\r\n|\r|\n/);
      };
    this.$detectNewLine = function (text) {
      var match = text.match(/^.*?(\r\n|\r|\n)/m);
      if (match) {
        this.$autoNewLine = match[1];
      } else {
        this.$autoNewLine = "\n";
      }
    };
    this.getNewLineCharacter = function () {
      switch (this.$newLineMode) {
        case "windows":
          return "\r\n";

        case "unix":
          return "\n";

        case "auto":
          return this.$autoNewLine;
      }
    };

    this.$autoNewLine = "\n";
    this.$newLineMode = "auto";
    this.setNewLineMode = function (newLineMode) {
      if (this.$newLineMode === newLineMode)
        return;

      this.$newLineMode = newLineMode;
    };
    this.getNewLineMode = function () {
      return this.$newLineMode;
    };
    this.isNewLine = function (text) {
      return (text == "\r\n" || text == "\r" || text == "\n");
    };
    this.getLine = function (row) {
      return this.$lines[row] || "";
    };
    this.getLines = function (firstRow, lastRow) {
      return this.$lines.slice(firstRow, lastRow + 1);
    };
    this.getAllLines = function () {
      return this.getLines(0, this.getLength());
    };
    this.getLength = function () {
      return this.$lines.length;
    };
    this.getTextRange = function (range) {
      if (range.start.row == range.end.row) {
        return this.$lines[range.start.row].substring(range.start.column,
          range.end.column);
      }
      else {
        var lines = this.getLines(range.start.row + 1, range.end.row - 1);
        lines.unshift((this.$lines[range.start.row] || "").substring(range.start.column));
        lines.push((this.$lines[range.end.row] || "").substring(0, range.end.column));
        return lines.join(this.getNewLineCharacter());
      }
    };
    this.$clipPosition = function (position) {
      var length = this.getLength();
      if (position.row >= length) {
        position.row = Math.max(0, length - 1);
        position.column = this.getLine(length - 1).length;
      }
      return position;
    };
    this.insert = function (position, text) {
      if (!text || text.length === 0)
        return position;

      position = this.$clipPosition(position);
      if (this.getLength() <= 1)
        this.$detectNewLine(text);

      var lines = this.$split(text);
      var firstLine = lines.splice(0, 1)[0];
      var lastLine = lines.length == 0 ? null : lines.splice(lines.length - 1, 1)[0];

      position = this.insertInLine(position, firstLine);
      if (lastLine !== null) {
        position = this.insertNewLine(position); // terminate first line
        position = this.insertLines(position.row, lines);
        position = this.insertInLine(position, lastLine || "");
      }
      return position;
    };
    this.insertLines = function (row, lines) {
      if (lines.length == 0)
        return {row: row, column: 0};
      if (lines.length > 0xFFFF) {
        var end = this.insertLines(row, lines.slice(0xFFFF));
        lines = lines.slice(0, 0xFFFF);
      }

      var args = [row, 0];
      args.push.apply(args, lines);
      this.$lines.splice.apply(this.$lines, args);

      var range = new Range(row, 0, row + lines.length, 0);
      var delta = {
        action: "insertLines",
        range: range,
        lines: lines
      };
      this._emit("change", { data: delta });
      return end || range.end;
    };
    this.insertNewLine = function (position) {
      position = this.$clipPosition(position);
      var line = this.$lines[position.row] || "";

      this.$lines[position.row] = line.substring(0, position.column);
      this.$lines.splice(position.row + 1, 0, line.substring(position.column, line.length));

      var end = {
        row: position.row + 1,
        column: 0
      };

      var delta = {
        action: "insertText",
        range: Range.fromPoints(position, end),
        text: this.getNewLineCharacter()
      };
      this._emit("change", { data: delta });

      return end;
    };
    this.insertInLine = function (position, text) {
      if (text.length == 0)
        return position;

      var line = this.$lines[position.row] || "";

      this.$lines[position.row] = line.substring(0, position.column) + text
        + line.substring(position.column);

      var end = {
        row: position.row,
        column: position.column + text.length
      };

      var delta = {
        action: "insertText",
        range: Range.fromPoints(position, end),
        text: text
      };
      this._emit("change", { data: delta });

      return end;
    };
    this.remove = function (range) {
      range.start = this.$clipPosition(range.start);
      range.end = this.$clipPosition(range.end);

      if (range.isEmpty())
        return range.start;

      var firstRow = range.start.row;
      var lastRow = range.end.row;

      if (range.isMultiLine()) {
        var firstFullRow = range.start.column == 0 ? firstRow : firstRow + 1;
        var lastFullRow = lastRow - 1;

        if (range.end.column > 0)
          this.removeInLine(lastRow, 0, range.end.column);

        if (lastFullRow >= firstFullRow)
          this.removeLines(firstFullRow, lastFullRow);

        if (firstFullRow != firstRow) {
          this.removeInLine(firstRow, range.start.column, this.getLine(firstRow).length);
          this.removeNewLine(range.start.row);
        }
      }
      else {
        this.removeInLine(firstRow, range.start.column, range.end.column);
      }
      return range.start;
    };
    this.removeInLine = function (row, startColumn, endColumn) {
      if (startColumn == endColumn)
        return;

      var range = new Range(row, startColumn, row, endColumn);
      var line = this.getLine(row);
      var removed = line.substring(startColumn, endColumn);
      var newLine = line.substring(0, startColumn) + line.substring(endColumn, line.length);
      this.$lines.splice(row, 1, newLine);

      var delta = {
        action: "removeText",
        range: range,
        text: removed
      };
      this._emit("change", { data: delta });
      return range.start;
    };
    this.removeLines = function (firstRow, lastRow) {
      var range = new Range(firstRow, 0, lastRow + 1, 0);
      var removed = this.$lines.splice(firstRow, lastRow - firstRow + 1);

      var delta = {
        action: "removeLines",
        range: range,
        nl: this.getNewLineCharacter(),
        lines: removed
      };
      this._emit("change", { data: delta });
      return removed;
    };
    this.removeNewLine = function (row) {
      var firstLine = this.getLine(row);
      var secondLine = this.getLine(row + 1);

      var range = new Range(row, firstLine.length, row + 1, 0);
      var line = firstLine + secondLine;

      this.$lines.splice(row, 2, line);

      var delta = {
        action: "removeText",
        range: range,
        text: this.getNewLineCharacter()
      };
      this._emit("change", { data: delta });
    };
    this.replace = function (range, text) {
      if (text.length == 0 && range.isEmpty())
        return range.start;
      if (text == this.getTextRange(range))
        return range.end;

      this.remove(range);
      if (text) {
        var end = this.insert(range.start, text);
      }
      else {
        end = range.start;
      }

      return end;
    };
    this.applyDeltas = function (deltas) {
      for (var i = 0; i < deltas.length; i++) {
        var delta = deltas[i];
        var range = Range.fromPoints(delta.range.start, delta.range.end);

        if (delta.action == "insertLines")
          this.insertLines(range.start.row, delta.lines);
        else if (delta.action == "insertText")
          this.insert(range.start, delta.text);
        else if (delta.action == "removeLines")
          this.removeLines(range.start.row, range.end.row - 1);
        else if (delta.action == "removeText")
          this.remove(range);
      }
    };
    this.revertDeltas = function (deltas) {
      for (var i = deltas.length - 1; i >= 0; i--) {
        var delta = deltas[i];

        var range = Range.fromPoints(delta.range.start, delta.range.end);

        if (delta.action == "insertLines")
          this.removeLines(range.start.row, range.end.row - 1);
        else if (delta.action == "insertText")
          this.remove(range);
        else if (delta.action == "removeLines")
          this.insertLines(range.start.row, delta.lines);
        else if (delta.action == "removeText")
          this.insert(range.start, delta.text);
      }
    };

  }).call(Document.prototype);

  exports.Document = Document;
});

define('ace/range', ['require', 'exports', 'module' ], function (require, exports, module) {
  var Range = function (startRow, startColumn, endRow, endColumn) {
    this.start = {
      row: startRow,
      column: startColumn
    };

    this.end = {
      row: endRow,
      column: endColumn
    };
  };

  (function () {
    this.isEqual = function (range) {
      return this.start.row == range.start.row &&
        this.end.row == range.end.row &&
        this.start.column == range.start.column &&
        this.end.column == range.end.column
    };
    this.toString = function () {
      return ("Range: [" + this.start.row + "/" + this.start.column +
        "] -> [" + this.end.row + "/" + this.end.column + "]");
    };

    this.contains = function (row, column) {
      return this.compare(row, column) == 0;
    };
    this.compareRange = function (range) {
      var cmp,
        end = range.end,
        start = range.start;

      cmp = this.compare(end.row, end.column);
      if (cmp == 1) {
        cmp = this.compare(start.row, start.column);
        if (cmp == 1) {
          return 2;
        } else if (cmp == 0) {
          return 1;
        } else {
          return 0;
        }
      } else if (cmp == -1) {
        return -2;
      } else {
        cmp = this.compare(start.row, start.column);
        if (cmp == -1) {
          return -1;
        } else if (cmp == 1) {
          return 42;
        } else {
          return 0;
        }
      }
    }
    this.comparePoint = function (p) {
      return this.compare(p.row, p.column);
    }
    this.containsRange = function (range) {
      return this.comparePoint(range.start) == 0 && this.comparePoint(range.end) == 0;
    }
    this.intersects = function (range) {
      var cmp = this.compareRange(range);
      return (cmp == -1 || cmp == 0 || cmp == 1);
    }
    this.isEnd = function (row, column) {
      return this.end.row == row && this.end.column == column;
    }
    this.isStart = function (row, column) {
      return this.start.row == row && this.start.column == column;
    }
    this.setStart = function (row, column) {
      if (typeof row == "object") {
        this.start.column = row.column;
        this.start.row = row.row;
      } else {
        this.start.row = row;
        this.start.column = column;
      }
    }
    this.setEnd = function (row, column) {
      if (typeof row == "object") {
        this.end.column = row.column;
        this.end.row = row.row;
      } else {
        this.end.row = row;
        this.end.column = column;
      }
    }
    this.inside = function (row, column) {
      if (this.compare(row, column) == 0) {
        if (this.isEnd(row, column) || this.isStart(row, column)) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    }
    this.insideStart = function (row, column) {
      if (this.compare(row, column) == 0) {
        if (this.isEnd(row, column)) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    }
    this.insideEnd = function (row, column) {
      if (this.compare(row, column) == 0) {
        if (this.isStart(row, column)) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    }
    this.compare = function (row, column) {
      if (!this.isMultiLine()) {
        if (row === this.start.row) {
          return column < this.start.column ? -1 : (column > this.end.column ? 1 : 0);
        }
        ;
      }

      if (row < this.start.row)
        return -1;

      if (row > this.end.row)
        return 1;

      if (this.start.row === row)
        return column >= this.start.column ? 0 : -1;

      if (this.end.row === row)
        return column <= this.end.column ? 0 : 1;

      return 0;
    };
    this.compareStart = function (row, column) {
      if (this.start.row == row && this.start.column == column) {
        return -1;
      } else {
        return this.compare(row, column);
      }
    }
    this.compareEnd = function (row, column) {
      if (this.end.row == row && this.end.column == column) {
        return 1;
      } else {
        return this.compare(row, column);
      }
    }
    this.compareInside = function (row, column) {
      if (this.end.row == row && this.end.column == column) {
        return 1;
      } else if (this.start.row == row && this.start.column == column) {
        return -1;
      } else {
        return this.compare(row, column);
      }
    }
    this.clipRows = function (firstRow, lastRow) {
      if (this.end.row > lastRow) {
        var end = {
          row: lastRow + 1,
          column: 0
        };
      }

      if (this.start.row > lastRow) {
        var start = {
          row: lastRow + 1,
          column: 0
        };
      }

      if (this.start.row < firstRow) {
        var start = {
          row: firstRow,
          column: 0
        };
      }

      if (this.end.row < firstRow) {
        var end = {
          row: firstRow,
          column: 0
        };
      }
      return Range.fromPoints(start || this.start, end || this.end);
    };
    this.extend = function (row, column) {
      var cmp = this.compare(row, column);

      if (cmp == 0)
        return this;
      else if (cmp == -1)
        var start = {row: row, column: column};
      else
        var end = {row: row, column: column};

      return Range.fromPoints(start || this.start, end || this.end);
    };

    this.isEmpty = function () {
      return (this.start.row == this.end.row && this.start.column == this.end.column);
    };
    this.isMultiLine = function () {
      return (this.start.row !== this.end.row);
    };
    this.clone = function () {
      return Range.fromPoints(this.start, this.end);
    };
    this.collapseRows = function () {
      if (this.end.column == 0)
        return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row - 1), 0)
      else
        return new Range(this.start.row, 0, this.end.row, 0)
    };
    this.toScreenRange = function (session) {
      var screenPosStart =
        session.documentToScreenPosition(this.start);
      var screenPosEnd =
        session.documentToScreenPosition(this.end);

      return new Range(
        screenPosStart.row, screenPosStart.column,
        screenPosEnd.row, screenPosEnd.column
      );
    };

  }).call(Range.prototype);
  Range.fromPoints = function (start, end) {
    return new Range(start.row, start.column, end.row, end.column);
  };

  exports.Range = Range;
});

define('ace/anchor', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/lib/event_emitter'], function (require, exports, module) {


  var oop = require("./lib/oop");
  var EventEmitter = require("./lib/event_emitter").EventEmitter;

  var Anchor = exports.Anchor = function (doc, row, column) {
    this.document = doc;

    if (typeof column == "undefined")
      this.setPosition(row.row, row.column);
    else
      this.setPosition(row, column);

    this.$onChange = this.onChange.bind(this);
    doc.on("change", this.$onChange);
  };

  (function () {

    oop.implement(this, EventEmitter);

    this.getPosition = function () {
      return this.$clipPositionToDocument(this.row, this.column);
    };

    this.getDocument = function () {
      return this.document;
    };

    this.onChange = function (e) {
      var delta = e.data;
      var range = delta.range;

      if (range.start.row == range.end.row && range.start.row != this.row)
        return;

      if (range.start.row > this.row)
        return;

      if (range.start.row == this.row && range.start.column > this.column)
        return;

      var row = this.row;
      var column = this.column;

      if (delta.action === "insertText") {
        if (range.start.row === row && range.start.column <= column) {
          if (range.start.row === range.end.row) {
            column += range.end.column - range.start.column;
          }
          else {
            column -= range.start.column;
            row += range.end.row - range.start.row;
          }
        }
        else if (range.start.row !== range.end.row && range.start.row < row) {
          row += range.end.row - range.start.row;
        }
      } else if (delta.action === "insertLines") {
        if (range.start.row <= row) {
          row += range.end.row - range.start.row;
        }
      }
      else if (delta.action == "removeText") {
        if (range.start.row == row && range.start.column < column) {
          if (range.end.column >= column)
            column = range.start.column;
          else
            column = Math.max(0, column - (range.end.column - range.start.column));

        } else if (range.start.row !== range.end.row && range.start.row < row) {
          if (range.end.row == row) {
            column = Math.max(0, column - range.end.column) + range.start.column;
          }
          row -= (range.end.row - range.start.row);
        }
        else if (range.end.row == row) {
          row -= range.end.row - range.start.row;
          column = Math.max(0, column - range.end.column) + range.start.column;
        }
      } else if (delta.action == "removeLines") {
        if (range.start.row <= row) {
          if (range.end.row <= row)
            row -= range.end.row - range.start.row;
          else {
            row = range.start.row;
            column = 0;
          }
        }
      }

      this.setPosition(row, column, true);
    };

    this.setPosition = function (row, column, noClip) {
      var pos;
      if (noClip) {
        pos = {
          row: row,
          column: column
        };
      }
      else {
        pos = this.$clipPositionToDocument(row, column);
      }

      if (this.row == pos.row && this.column == pos.column)
        return;

      var old = {
        row: this.row,
        column: this.column
      };

      this.row = pos.row;
      this.column = pos.column;
      this._emit("change", {
        old: old,
        value: pos
      });
    };

    this.detach = function () {
      this.document.removeEventListener("change", this.$onChange);
    };

    this.$clipPositionToDocument = function (row, column) {
      var pos = {};

      if (row >= this.document.getLength()) {
        pos.row = Math.max(0, this.document.getLength() - 1);
        pos.column = this.document.getLine(pos.row).length;
      }
      else if (row < 0) {
        pos.row = 0;
        pos.column = 0;
      }
      else {
        pos.row = row;
        pos.column = Math.min(this.document.getLine(pos.row).length, Math.max(0, column));
      }

      if (column < 0)
        pos.column = 0;

      return pos;
    };

  }).call(Anchor.prototype);

});

define('ace/lib/lang', ['require', 'exports', 'module' ], function (require, exports, module) {


  exports.stringReverse = function (string) {
    return string.split("").reverse().join("");
  };

  exports.stringRepeat = function (string, count) {
    return new Array(count + 1).join(string);
  };

  var trimBeginRegexp = /^\s\s*/;
  var trimEndRegexp = /\s\s*$/;

  exports.stringTrimLeft = function (string) {
    return string.replace(trimBeginRegexp, '');
  };

  exports.stringTrimRight = function (string) {
    return string.replace(trimEndRegexp, '');
  };

  exports.copyObject = function (obj) {
    var copy = {};
    for (var key in obj) {
      copy[key] = obj[key];
    }
    return copy;
  };

  exports.copyArray = function (array) {
    var copy = [];
    for (var i = 0, l = array.length; i < l; i++) {
      if (array[i] && typeof array[i] == "object")
        copy[i] = this.copyObject(array[i]);
      else
        copy[i] = array[i];
    }
    return copy;
  };

  exports.deepCopy = function (obj) {
    if (typeof obj != "object") {
      return obj;
    }

    var copy = obj.constructor();
    for (var key in obj) {
      if (typeof obj[key] == "object") {
        copy[key] = this.deepCopy(obj[key]);
      } else {
        copy[key] = obj[key];
      }
    }
    return copy;
  };

  exports.arrayToMap = function (arr) {
    var map = {};
    for (var i = 0; i < arr.length; i++) {
      map[arr[i]] = 1;
    }
    return map;

  };

  exports.createMap = function (props) {
    var map = Object.create(null);
    for (var i in props) {
      map[i] = props[i];
    }
    return map;
  };
  exports.arrayRemove = function (array, value) {
    for (var i = 0; i <= array.length; i++) {
      if (value === array[i]) {
        array.splice(i, 1);
      }
    }
  };

  exports.escapeRegExp = function (str) {
    return str.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
  };

  exports.escapeHTML = function (str) {
    return str.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
  };

  exports.getMatchOffsets = function (string, regExp) {
    var matches = [];

    string.replace(regExp, function (str) {
      matches.push({
        offset: arguments[arguments.length - 2],
        length: str.length
      });
    });

    return matches;
  };
  exports.deferredCall = function (fcn) {

    var timer = null;
    var callback = function () {
      timer = null;
      fcn();
    };

    var deferred = function (timeout) {
      deferred.cancel();
      timer = setTimeout(callback, timeout || 0);
      return deferred;
    };

    deferred.schedule = deferred;

    deferred.call = function () {
      this.cancel();
      fcn();
      return deferred;
    };

    deferred.cancel = function () {
      clearTimeout(timer);
      timer = null;
      return deferred;
    };

    return deferred;
  };


  exports.delayedCall = function (fcn, defaultTimeout) {
    var timer = null;
    var callback = function () {
      timer = null;
      fcn();
    };

    var _self = function (timeout) {
      timer && clearTimeout(timer);
      timer = setTimeout(callback, timeout || defaultTimeout);
    };

    _self.delay = delayed;
    _self.schedule = function (timeout) {
      if (timer == null)
        timer = setTimeout(callback, timeout || 0);
    };

    _self.call = function () {
      this.cancel();
      fcn();
    };

    _self.cancel = function () {
      timer && clearTimeout(timer);
      timer = null;
    };

    _self.isPending = function () {
      return timer;
    };

    return _self;
  };
});

define('ace/mode/sense/sense_parse', ['require', 'exports', 'module' ], function (require, exports, module) {

  var at,     // The index of the current character
    ch,     // The current character
    annos, // annotations
    escapee = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t'
    },
    text,

    annotate = function (type, text) {
      annos.push({type: type, text: text, at: at});
    },

    error = function (m) {

      throw {
        name: 'SyntaxError',
        message: m,
        at: at,
        text: text
      };
    },


    reset = function (newAt) {
      ch = text.charAt(newAt);
      at = newAt + 1;
    },

    next = function (c) {

      if (c && c !== ch) {
        error("Expected '" + c + "' instead of '" + ch + "'");
      }

      ch = text.charAt(at);
      at += 1;
      return ch;
    },

    number = function () {

      var number,
        string = '';

      if (ch === '-') {
        string = '-';
        next('-');
      }
      while (ch >= '0' && ch <= '9') {
        string += ch;
        next();
      }
      if (ch === '.') {
        string += '.';
        while (next() && ch >= '0' && ch <= '9') {
          string += ch;
        }
      }
      if (ch === 'e' || ch === 'E') {
        string += ch;
        next();
        if (ch === '-' || ch === '+') {
          string += ch;
          next();
        }
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      }
      number = +string;
      if (isNaN(number)) {
        error("Bad number");
      } else {
        return number;
      }
    },

    string = function () {

      var hex,
        i,
        string = '',
        uffff;

      if (ch === '"') {
        while (next()) {
          if (ch === '"') {
            next();
            return string;
          } else if (ch === '\\') {
            next();
            if (ch === 'u') {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) {
                  break;
                }
                uffff = uffff * 16 + hex;
              }
              string += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === 'string') {
              string += escapee[ch];
            } else {
              break;
            }
          } else {
            string += ch;
          }
        }
      }
      error("Bad string");
    },

    white = function () {

      while (ch && ch <= ' ') {
        next();
      }
    },

    strictWhite = function () {

      while (ch && ( ch == ' ' || ch == '\t')) {
        next();
      }
    },

    newLine = function () {
      if (ch == '\n') next();
    },

    word = function () {

      switch (ch) {
        case 't':
          next('t');
          next('r');
          next('u');
          next('e');
          return true;
        case 'f':
          next('f');
          next('a');
          next('l');
          next('s');
          next('e');
          return false;
        case 'n':
          next('n');
          next('u');
          next('l');
          next('l');
          return null;
      }
      error("Unexpected '" + ch + "'");
    },

  // parses and returns the method
    method = function () {
      switch (ch) {
        case 'G':
          next('G');
          next('E');
          next('T');
          return "GET";
        case 'H':
          next('H');
          next('E');
          next('A');
          next('D');
          return "HEAD";
        case 'D':
          next('D');
          next('E');
          next('L');
          next('E');
          next('T');
          next('E');
          return "DELETE";
        case 'P':
          next('P');
          switch (ch) {
            case 'U':
              next('U');
              next('T');
              return "PUT";
            case 'O':
              next('O');
              next('S');
              next('T');
              return "POST";
            default:
              error("Unexpected '" + ch + "'");
          }
        default:
          error("Expected one of GET/POST/PUT/DELETE/HEAD");
      }

    },

    value,  // Place holder for the value function.

    array = function () {

      var array = [];

      if (ch === '[') {
        next('[');
        white();
        if (ch === ']') {
          next(']');
          return array;   // empty array
        }
        while (ch) {
          array.push(value());
          white();
          if (ch === ']') {
            next(']');
            return array;
          }
          next(',');
          white();
        }
      }
      error("Bad array");
    },

    object = function () {

      var key,
        object = {};

      if (ch === '{') {
        next('{');
        white();
        if (ch === '}') {
          next('}');
          return object;   // empty object
        }
        while (ch) {
          key = string();
          white();
          next(':');
          if (Object.hasOwnProperty.call(object, key)) {
            error('Duplicate key "' + key + '"');
          }
          object[key] = value();
          white();
          if (ch === '}') {
            next('}');
            return object;
          }
          next(',');
          white();
        }
      }
      error("Bad object");
    };

  value = function () {

    white();
    switch (ch) {
      case '{':
        return object();
      case '[':
        return array();
      case '"':
        return string();
      case '-':
        return number();
      default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
  };

  url = function () {

    var url = '';
    while (ch && ch != '\n') {
      url += ch;
      next();
    }
    if (url == '')
      error('Missing url');
    return url;
  };

  request = function () {
    white();
    var meth = method();
    strictWhite();
    url();
    strictWhite(); // advance to one new line
    newLine();
    strictWhite();
    if (ch == '{') {
      if (meth == "GET") {
        annotate("warning", "Browsers do not support " + meth + " requests with a body. This will be executed as a POST.");
      }
      object();
    }
    // multi doc request
    strictWhite(); // advance to one new line
    newLine();
    strictWhite();
    while (ch == '{') {
      // another object
      object();
      strictWhite();
      newLine();
      strictWhite();
    }

  };

  comment = function () {
    while (ch == '#') {
      while (ch && ch !== '\n') {
        next();
      }
    }
  };

  multi_request = function () {
    while (ch && ch != '') {
      white();
      try {
        comment();
        request();
        white();
      }
      catch (e) {
        annotate("error", e.message);
        // snap
        var substring = text.substr(at);
        var nextMatch = substring.search(/^POST|HEAD|GET|PUT|DELETE/m);
        if (nextMatch < 1) return;
        reset(at + nextMatch);
      }
    }
  };


  return function (source, reviver) {
    var result;

    text = source;
    at = 0;
    annos = [];
    next();
    multi_request();
    white();
    if (ch) {
      annotate("error", "Syntax error");
    }

    result = { "annotations": annos };


    return typeof reviver === 'function' ? function walk(holder, key) {
      var k, v, value = holder[key];
      if (value && typeof value === 'object') {
        for (k in value) {
          if (Object.hasOwnProperty.call(value, k)) {
            v = walk(value, k);
            if (v !== undefined) {
              value[k] = v;
            } else {
              delete value[k];
            }
          }
        }
      }
      return reviver.call(holder, key, value);
    }({'': result}, '') : result;
  };
});
