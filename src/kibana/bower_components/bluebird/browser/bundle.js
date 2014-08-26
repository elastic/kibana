;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// UTILITY
var util = require('util');
var shims = require('_shims');
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  this.message = options.message || getMessage(this);
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = shims.keys(a),
        kb = shims.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};
},{"_shims":1,"util":6}],3:[function(require,module,exports){

// not implemented
// The reason for having an empty file and not throwing is to allow
// untraditional implementation of this module.

},{}],4:[function(require,module,exports){
module.exports=require(3)
},{}],5:[function(require,module,exports){
var process=require("__browserify_process");// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');
var shims = require('_shims');

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (!util.isString(path)) {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(shims.filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = shims.substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(shims.filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(shims.filter(paths, function(p, index) {
    if (!util.isString(p)) {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

},{"__browserify_process":16,"_shims":1,"util":6}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var shims = require('_shims');

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  shims.forEach(array, function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }

  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = shims.reduce(output, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return shims.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.binarySlice === 'function'
  ;
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":1}],7:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],8:[function(require,module,exports){
var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding, offset) {
  if(!assert) assert= require('assert');
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    while (subject.length % 4 != 0) {
      subject = subject + "="; 
    }
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    // slicing works, with limitations (no parent tracking/update)
    // check https://github.com/toots/buffer-browserify/issues/19
    for (var i = 0; i < this.length; i++) {
        this[i] = subject.get(i+offset);
    }
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          this[i] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

// slice(start, end)
function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

Buffer.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

},{"./buffer_ieee754":7,"assert":2,"base64-js":9}],9:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],10:[function(require,module,exports){
var Buffer = require('buffer').Buffer;
var intSize = 4;
var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
var chrsz = 8;

function toArray(buf, bigEndian) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize));
    buf = Buffer.concat([buf, zeroBuffer], len);
  }

  var arr = [];
  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
  for (var i = 0; i < buf.length; i += intSize) {
    arr.push(fn.call(buf, i));
  }
  return arr;
}

function toBuffer(arr, size, bigEndian) {
  var buf = new Buffer(size);
  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
  for (var i = 0; i < arr.length; i++) {
    fn.call(buf, arr[i], i * 4, true);
  }
  return buf;
}

function hash(buf, fn, hashSize, bigEndian) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
  return toBuffer(arr, hashSize, bigEndian);
}

module.exports = { hash: hash };

},{"buffer":8}],11:[function(require,module,exports){
var Buffer = require('buffer').Buffer
var sha = require('./sha')
var sha256 = require('./sha256')
var rng = require('./rng')
var md5 = require('./md5')

var algorithms = {
  sha1: sha,
  sha256: sha256,
  md5: md5
}

var blocksize = 64
var zeroBuffer = new Buffer(blocksize); zeroBuffer.fill(0)
function hmac(fn, key, data) {
  if(!Buffer.isBuffer(key)) key = new Buffer(key)
  if(!Buffer.isBuffer(data)) data = new Buffer(data)

  if(key.length > blocksize) {
    key = fn(key)
  } else if(key.length < blocksize) {
    key = Buffer.concat([key, zeroBuffer], blocksize)
  }

  var ipad = new Buffer(blocksize), opad = new Buffer(blocksize)
  for(var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  var hash = fn(Buffer.concat([ipad, data]))
  return fn(Buffer.concat([opad, hash]))
}

function hash(alg, key) {
  alg = alg || 'sha1'
  var fn = algorithms[alg]
  var bufs = []
  var length = 0
  if(!fn) error('algorithm:', alg, 'is not yet supported')
  return {
    update: function (data) {
      bufs.push(data)
      length += data.length
      return this
    },
    digest: function (enc) {
      var buf = Buffer.concat(bufs)
      var r = key ? hmac(fn, key, buf) : fn(buf)
      bufs = null
      return enc ? r.toString(enc) : r
    }
  }
}

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) { return hash(alg) }
exports.createHmac = function (alg, key) { return hash(alg, key) }
exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)))
    } catch (err) { callback(err) }
  } else {
    return new Buffer(rng(size))
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
, 'pbkdf2'], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

},{"./md5":12,"./rng":13,"./sha":14,"./sha256":15,"buffer":8}],12:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var helpers = require('./helpers');

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function md5(buf) {
  return helpers.hash(buf, core_md5, 16);
};

},{"./helpers":10}],13:[function(require,module,exports){
// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  if (_global.crypto && crypto.getRandomValues) {
    var _rnds = new Uint32Array(4);
    whatwgRNG = function(size) {
      var bytes = new Array(size);
      crypto.getRandomValues(_rnds);

      for (var c = 0 ; c < size; c++) {
        bytes[c] = _rnds[c >> 2] >>> ((c & 0x03) * 8) & 0xff;
      }
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())

},{}],14:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var helpers = require('./helpers');

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function sha1(buf) {
  return helpers.hash(buf, core_sha1, 20, true);
};

},{"./helpers":10}],15:[function(require,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var helpers = require('./helpers');

var safe_add = function(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

var S = function(X, n) {
  return (X >>> n) | (X << (32 - n));
};

var R = function(X, n) {
  return (X >>> n);
};

var Ch = function(x, y, z) {
  return ((x & y) ^ ((~x) & z));
};

var Maj = function(x, y, z) {
  return ((x & y) ^ (x & z) ^ (y & z));
};

var Sigma0256 = function(x) {
  return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
};

var Sigma1256 = function(x) {
  return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
};

var Gamma0256 = function(x) {
  return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
};

var Gamma1256 = function(x) {
  return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
};

var core_sha256 = function(m, l) {
  var K = new Array(0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2);
  var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j;
    var T1, T2;
  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;
  for (var i = 0; i < m.length; i += 16) {
    a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
    for (var j = 0; j < 64; j++) {
      if (j < 16) {
        W[j] = m[j + i];
      } else {
        W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
      }
      T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
      T2 = safe_add(Sigma0256(a), Maj(a, b, c));
      h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
    }
    HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
    HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
};

module.exports = function sha256(buf) {
  return helpers.hash(buf, core_sha256, 32, true);
};

},{"./helpers":10}],16:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],17:[function(require,module,exports){
var Promise = require("../js/debug/bluebird.js");
Promise.onPossiblyUnhandledRejection();(function (){
    var global = window;
    global.adapter = Promise;
    global.sinon = require("sinon");
    global.assert = require("assert");
    global.setImmediate = function(fn){
        setTimeout(fn, 0);
    };
})();

;window.tests = [{fn: function(){ return require('../test/mocha/2.1.2.js');}, name: '../test/mocha/2.1.2.js'},
{fn: function(){ return require('../test/mocha/2.1.3.js');}, name: '../test/mocha/2.1.3.js'},
{fn: function(){ return require('../test/mocha/2.2.1.js');}, name: '../test/mocha/2.2.1.js'},
{fn: function(){ return require('../test/mocha/2.2.2.js');}, name: '../test/mocha/2.2.2.js'},
{fn: function(){ return require('../test/mocha/2.2.3.js');}, name: '../test/mocha/2.2.3.js'},
{fn: function(){ return require('../test/mocha/2.2.4.js');}, name: '../test/mocha/2.2.4.js'},
{fn: function(){ return require('../test/mocha/2.2.5.js');}, name: '../test/mocha/2.2.5.js'},
{fn: function(){ return require('../test/mocha/2.2.6.js');}, name: '../test/mocha/2.2.6.js'},
{fn: function(){ return require('../test/mocha/2.2.7.js');}, name: '../test/mocha/2.2.7.js'},
{fn: function(){ return require('../test/mocha/2.3.1.js');}, name: '../test/mocha/2.3.1.js'},
{fn: function(){ return require('../test/mocha/2.3.2.js');}, name: '../test/mocha/2.3.2.js'},
{fn: function(){ return require('../test/mocha/2.3.3.js');}, name: '../test/mocha/2.3.3.js'},
{fn: function(){ return require('../test/mocha/2.3.4.js');}, name: '../test/mocha/2.3.4.js'},
{fn: function(){ return require('../test/mocha/3.2.1.js');}, name: '../test/mocha/3.2.1.js'},
{fn: function(){ return require('../test/mocha/3.2.2.js');}, name: '../test/mocha/3.2.2.js'},
{fn: function(){ return require('../test/mocha/3.2.3.js');}, name: '../test/mocha/3.2.3.js'},
{fn: function(){ return require('../test/mocha/3.2.4.js');}, name: '../test/mocha/3.2.4.js'},
{fn: function(){ return require('../test/mocha/3.2.5.js');}, name: '../test/mocha/3.2.5.js'},
{fn: function(){ return require('../test/mocha/3.2.6.js');}, name: '../test/mocha/3.2.6.js'},
{fn: function(){ return require('../test/mocha/api_exceptions.js');}, name: '../test/mocha/api_exceptions.js'},
{fn: function(){ return require('../test/mocha/async.js');}, name: '../test/mocha/async.js'},
{fn: function(){ return require('../test/mocha/bind.js');}, name: '../test/mocha/bind.js'},
{fn: function(){ return require('../test/mocha/bluebird-multiple-instances.js');}, name: '../test/mocha/bluebird-multiple-instances.js'},
{fn: function(){ return require('../test/mocha/call.js');}, name: '../test/mocha/call.js'},
{fn: function(){ return require('../test/mocha/cancel.js');}, name: '../test/mocha/cancel.js'},
{fn: function(){ return require('../test/mocha/catch_filter.js');}, name: '../test/mocha/catch_filter.js'},
{fn: function(){ return require('../test/mocha/collections_thenables.js');}, name: '../test/mocha/collections_thenables.js'},
{fn: function(){ return require('../test/mocha/constructor.js');}, name: '../test/mocha/constructor.js'},
{fn: function(){ return require('../test/mocha/cycles.js');}, name: '../test/mocha/cycles.js'},
{fn: function(){ return require('../test/mocha/direct_resolving.js');}, name: '../test/mocha/direct_resolving.js'},
{fn: function(){ return require('../test/mocha/domain.js');}, name: '../test/mocha/domain.js'},
{fn: function(){ return require('../test/mocha/each.js');}, name: '../test/mocha/each.js'},
{fn: function(){ return require('../test/mocha/error.js');}, name: '../test/mocha/error.js'},
{fn: function(){ return require('../test/mocha/filter.js');}, name: '../test/mocha/filter.js'},
{fn: function(){ return require('../test/mocha/following.js');}, name: '../test/mocha/following.js'},
{fn: function(){ return require('../test/mocha/get.js');}, name: '../test/mocha/get.js'},
{fn: function(){ return require('../test/mocha/github36.js');}, name: '../test/mocha/github36.js'},
{fn: function(){ return require('../test/mocha/late_buffer_safety.js');}, name: '../test/mocha/late_buffer_safety.js'},
{fn: function(){ return require('../test/mocha/method.js');}, name: '../test/mocha/method.js'},
{fn: function(){ return require('../test/mocha/promisify.js');}, name: '../test/mocha/promisify.js'},
{fn: function(){ return require('../test/mocha/props.js');}, name: '../test/mocha/props.js'},
{fn: function(){ return require('../test/mocha/q_all.js');}, name: '../test/mocha/q_all.js'},
{fn: function(){ return require('../test/mocha/q_done.js');}, name: '../test/mocha/q_done.js'},
{fn: function(){ return require('../test/mocha/q_fin.js');}, name: '../test/mocha/q_fin.js'},
{fn: function(){ return require('../test/mocha/q_inspect.js');}, name: '../test/mocha/q_inspect.js'},
{fn: function(){ return require('../test/mocha/q_make_node_resolver.js');}, name: '../test/mocha/q_make_node_resolver.js'},
{fn: function(){ return require('../test/mocha/q_nodeify.js');}, name: '../test/mocha/q_nodeify.js'},
{fn: function(){ return require('../test/mocha/q_progress.js');}, name: '../test/mocha/q_progress.js'},
{fn: function(){ return require('../test/mocha/q_propagation.js');}, name: '../test/mocha/q_propagation.js'},
{fn: function(){ return require('../test/mocha/q_settle.js');}, name: '../test/mocha/q_settle.js'},
{fn: function(){ return require('../test/mocha/q_spread.js');}, name: '../test/mocha/q_spread.js'},
{fn: function(){ return require('../test/mocha/race.js');}, name: '../test/mocha/race.js'},
{fn: function(){ return require('../test/mocha/reduce.js');}, name: '../test/mocha/reduce.js'},
{fn: function(){ return require('../test/mocha/resolution.js');}, name: '../test/mocha/resolution.js'},
{fn: function(){ return require('../test/mocha/reused_promise.js');}, name: '../test/mocha/reused_promise.js'},
{fn: function(){ return require('../test/mocha/schedule.js');}, name: '../test/mocha/schedule.js'},
{fn: function(){ return require('../test/mocha/some.js');}, name: '../test/mocha/some.js'},
{fn: function(){ return require('../test/mocha/tap.js');}, name: '../test/mocha/tap.js'},
{fn: function(){ return require('../test/mocha/timers.js');}, name: '../test/mocha/timers.js'},
{fn: function(){ return require('../test/mocha/try.js');}, name: '../test/mocha/try.js'},
{fn: function(){ return require('../test/mocha/unhandled_rejections.js');}, name: '../test/mocha/unhandled_rejections.js'},
{fn: function(){ return require('../test/mocha/using.js');}, name: '../test/mocha/using.js'},
{fn: function(){ return require('../test/mocha/when_all.js');}, name: '../test/mocha/when_all.js'},
{fn: function(){ return require('../test/mocha/when_any.js');}, name: '../test/mocha/when_any.js'},
{fn: function(){ return require('../test/mocha/when_defer.js');}, name: '../test/mocha/when_defer.js'},
{fn: function(){ return require('../test/mocha/when_join.js');}, name: '../test/mocha/when_join.js'},
{fn: function(){ return require('../test/mocha/when_map.js');}, name: '../test/mocha/when_map.js'},
{fn: function(){ return require('../test/mocha/when_reduce.js');}, name: '../test/mocha/when_reduce.js'},
{fn: function(){ return require('../test/mocha/when_settle.js');}, name: '../test/mocha/when_settle.js'},
{fn: function(){ return require('../test/mocha/when_some.js');}, name: '../test/mocha/when_some.js'},
{fn: function(){ return require('../test/mocha/when_spread.js');}, name: '../test/mocha/when_spread.js'}];
},{"../js/debug/bluebird.js":21,"../test/mocha/2.1.2.js":70,"../test/mocha/2.1.3.js":71,"../test/mocha/2.2.1.js":72,"../test/mocha/2.2.2.js":73,"../test/mocha/2.2.3.js":74,"../test/mocha/2.2.4.js":75,"../test/mocha/2.2.5.js":76,"../test/mocha/2.2.6.js":77,"../test/mocha/2.2.7.js":78,"../test/mocha/2.3.1.js":79,"../test/mocha/2.3.2.js":80,"../test/mocha/2.3.3.js":81,"../test/mocha/2.3.4.js":82,"../test/mocha/3.2.1.js":83,"../test/mocha/3.2.2.js":84,"../test/mocha/3.2.3.js":85,"../test/mocha/3.2.4.js":86,"../test/mocha/3.2.5.js":87,"../test/mocha/3.2.6.js":88,"../test/mocha/api_exceptions.js":89,"../test/mocha/async.js":90,"../test/mocha/bind.js":91,"../test/mocha/bluebird-multiple-instances.js":92,"../test/mocha/call.js":93,"../test/mocha/cancel.js":94,"../test/mocha/catch_filter.js":95,"../test/mocha/collections_thenables.js":96,"../test/mocha/constructor.js":97,"../test/mocha/cycles.js":98,"../test/mocha/direct_resolving.js":99,"../test/mocha/domain.js":100,"../test/mocha/each.js":101,"../test/mocha/error.js":102,"../test/mocha/filter.js":103,"../test/mocha/following.js":104,"../test/mocha/get.js":105,"../test/mocha/github36.js":106,"../test/mocha/late_buffer_safety.js":111,"../test/mocha/method.js":112,"../test/mocha/promisify.js":113,"../test/mocha/props.js":114,"../test/mocha/q_all.js":115,"../test/mocha/q_done.js":116,"../test/mocha/q_fin.js":117,"../test/mocha/q_inspect.js":118,"../test/mocha/q_make_node_resolver.js":119,"../test/mocha/q_nodeify.js":120,"../test/mocha/q_progress.js":121,"../test/mocha/q_propagation.js":122,"../test/mocha/q_settle.js":123,"../test/mocha/q_spread.js":124,"../test/mocha/race.js":125,"../test/mocha/reduce.js":126,"../test/mocha/resolution.js":127,"../test/mocha/reused_promise.js":128,"../test/mocha/schedule.js":129,"../test/mocha/some.js":130,"../test/mocha/tap.js":131,"../test/mocha/timers.js":132,"../test/mocha/try.js":133,"../test/mocha/unhandled_rejections.js":134,"../test/mocha/using.js":135,"../test/mocha/when_all.js":136,"../test/mocha/when_any.js":137,"../test/mocha/when_defer.js":138,"../test/mocha/when_join.js":139,"../test/mocha/when_map.js":140,"../test/mocha/when_reduce.js":141,"../test/mocha/when_settle.js":142,"../test/mocha/when_some.js":143,"../test/mocha/when_spread.js":144,"assert":2,"sinon":55}],18:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
var ASSERT = require("./assert.js");

function Promise$_Any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    if (promise.isRejected()) {
        return promise;
    }
    ASSERT((ret instanceof SomePromiseArray),
    "ret instanceof SomePromiseArray");
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function Promise$Any(promises) {
    return Promise$_Any(promises);
};

Promise.prototype.any = function Promise$any() {
    return Promise$_Any(this);
};

};

},{"./assert.js":19}],19:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = (function(){
var AssertionError = (function() {
    function AssertionError(a) {
        this.constructor$(a);
        this.message = a;
        this.name = "AssertionError";
    }
    AssertionError.prototype = new Error();
    AssertionError.prototype.constructor = AssertionError;
    AssertionError.prototype.constructor$ = Error;
    return AssertionError;
})();

function getParams(args) {
    var params = [];
    for (var i = 0; i < args.length; ++i) params.push("arg" + i);
    return params;
}

function nativeAssert(callName, args, expect) {
    try {
        var params = getParams(args);
        var constructorArgs = params;
        constructorArgs.push("return " +
                callName + "("+ params.join(",") + ");");
        var fn = Function.apply(null, constructorArgs);
        return fn.apply(null, args);
    } catch (e) {
        if (!(e instanceof SyntaxError)) {
            throw e;
        } else {
            return expect;
        }
    }
}

return function assert(boolExpr, message) {
    if (boolExpr === true) return;

    if (typeof boolExpr === "string" &&
        boolExpr.charAt(0) === "%") {
        var nativeCallName = boolExpr;
        var $_len = arguments.length;var args = new Array($_len - 2); for(var $_i = 2; $_i < $_len; ++$_i) {args[$_i - 2] = arguments[$_i];}
        if (nativeAssert(nativeCallName, args, message) === message) return;
        message = (nativeCallName + " !== " + message);
    }

    var ret = new AssertionError(message);
    if (Error.captureStackTrace) {
        Error.captureStackTrace(ret, assert);
    }
    if (console && console.error) {
        console.error(ret.stack + "");
    }
    throw ret;

};
})();

},{}],20:[function(require,module,exports){
var process=require("__browserify_process");/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var ASSERT = require("./assert.js");
var schedule = require("./schedule.js");
var Queue = require("./queue.js");
var errorObj = require("./util.js").errorObj;
var tryCatch1 = require("./util.js").tryCatch1;
var _process = typeof process !== "undefined" ? process : void 0;

function Async() {
    this._isTickUsed = false;
    this._schedule = schedule;
    this._length = 0;
    this._lateBuffer = new Queue(16);
    this._functionBuffer = new Queue(65536);
    var self = this;
    this.consumeFunctionBuffer = function Async$consumeFunctionBuffer() {
        self._consumeFunctionBuffer();
    };
}

Async.prototype.haveItemsQueued = function Async$haveItemsQueued() {
    return this._length > 0;
};

Async.prototype.invokeLater = function Async$invokeLater(fn, receiver, arg) {
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    ASSERT((arguments.length === 3),
    "arguments.length === 3");
    if (_process !== void 0 &&
        _process.domain != null &&
        !fn.domain) {
        fn = _process.domain.bind(fn);
    }
    this._lateBuffer.push(fn, receiver, arg);
    this._queueTick();
};

Async.prototype.invoke = function Async$invoke(fn, receiver, arg) {
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    ASSERT((arguments.length === 3),
    "arguments.length === 3");
    if (_process !== void 0 &&
        _process.domain != null &&
        !fn.domain) {
        fn = _process.domain.bind(fn);
    }
    var functionBuffer = this._functionBuffer;
    functionBuffer.push(fn, receiver, arg);
    this._length = functionBuffer.length();
    this._queueTick();
};

Async.prototype._consumeFunctionBuffer =
function Async$_consumeFunctionBuffer() {
    var functionBuffer = this._functionBuffer;
    ASSERT(this._isTickUsed,
    "this._isTickUsed");
    while (functionBuffer.length() > 0) {
        var fn = functionBuffer.shift();
        var receiver = functionBuffer.shift();
        var arg = functionBuffer.shift();
        fn.call(receiver, arg);
    }
    this._reset();
    this._consumeLateBuffer();
};

Async.prototype._consumeLateBuffer = function Async$_consumeLateBuffer() {
    var buffer = this._lateBuffer;
    while(buffer.length() > 0) {
        var fn = buffer.shift();
        var receiver = buffer.shift();
        var arg = buffer.shift();
        var res = tryCatch1(fn, receiver, arg);
        if (res === errorObj) {
            this._queueTick();
            if (fn.domain != null) {
                fn.domain.emit("error", res.e);
            } else {
                throw res.e;
            }
        }
    }
};

Async.prototype._queueTick = function Async$_queue() {
    if (!this._isTickUsed) {
        this._schedule(this.consumeFunctionBuffer);
        this._isTickUsed = true;
    }
};

Async.prototype._reset = function Async$_reset() {
    this._isTickUsed = false;
    this._length = 0;
};

module.exports = new Async();

},{"./assert.js":19,"./queue.js":43,"./schedule.js":46,"./util.js":53,"__browserify_process":16}],21:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var Promise = require("./promise.js")();
module.exports = Promise;
},{"./promise.js":38}],22:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var cr = Object.create;
var callerCache = cr && cr(null);
var getterCache = cr && cr(null);
callerCache[" size"] = getterCache[" size"] = 0;
module.exports = function(Promise) {
var util = require("./util.js");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

function makeMethodCaller (methodName) {
    return new Function("obj", "                                             \n\
        'use strict'                                                         \n\
        var len = this.length;                                               \n\
        switch(len) {                                                        \n\
            case 1: return obj.methodName(this[0]);                          \n\
            case 2: return obj.methodName(this[0], this[1]);                 \n\
            case 3: return obj.methodName(this[0], this[1], this[2]);        \n\
            case 0: return obj.methodName();                                 \n\
            default: return obj.methodName.apply(obj, this);                 \n\
        }                                                                    \n\
        ".replace(/methodName/g, methodName));
}

function makeGetter (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
}

function getCompiled(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
}

function getMethodCaller(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
}

function getGetter(name) {
    return getCompiled(name, makeGetter, getterCache);
}

function caller(obj) {
    return obj[this.pop()].apply(obj, this);
}
Promise.prototype.call = function Promise$call(methodName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
    if (canEvaluate) {
        var maybeCaller = getMethodCaller(methodName);
        if (maybeCaller !== null) {
            return this._then(maybeCaller, void 0, void 0, args, void 0);
        }
    }
    args.push(methodName);
    return this._then(caller, void 0, void 0, args, void 0);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    return obj[this];
}
Promise.prototype.get = function Promise$get(propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, void 0, void 0, propertyName, void 0);
};
};

},{"./util.js":53}],23:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var errors = require("./errors.js");
var canAttach = errors.canAttach;
var async = require("./async.js");
var ASSERT = require("./assert.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function Promise$_cancel(reason) {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== void 0 &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    ASSERT(promiseToReject.isCancellable(),
    "promiseToReject.isCancellable()");
    promiseToReject._attachExtraTrace(reason);
    promiseToReject._rejectUnchecked(reason);
};

Promise.prototype.cancel = function Promise$cancel(reason) {
    if (!this.isCancellable()) return this;
    reason = reason !== void 0
        ? (canAttach(reason) ? reason : new Error(reason + ""))
        : new CancellationError();
    async.invokeLater(this._cancel, this, reason);
    return this;
};

Promise.prototype.cancellable = function Promise$cancellable() {
    if (this._cancellable()) return this;
    this._setCancellable();
    this._cancellationParent = void 0;
    return this;
};

Promise.prototype.uncancellable = function Promise$uncancellable() {
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 2 | 4);
    ret._follow(this);
    ret._unsetCancellable();
    return ret;
};

Promise.prototype.fork =
function Promise$fork(didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         void 0, void 0);

    ret._setCancellable();
    ret._cancellationParent = void 0;
    return ret;
};
};

},{"./assert.js":19,"./async.js":20,"./errors.js":28}],24:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function() {
var ASSERT = require("./assert.js");
var inherits = require("./util.js").inherits;
var defineProperty = require("./es5.js").defineProperty;

var rignore = new RegExp(
    "\\b(?:[a-zA-Z0-9.]+\\$_\\w+|" +
    "tryCatch(?:1|2|3|4|Apply)|new \\w*PromiseArray|" +
    "\\w*PromiseArray\\.\\w*PromiseArray|" +
    "setTimeout|CatchFilter\\$_\\w+|makeNodePromisified|processImmediate|" +
    "process._tickCallback|nextTick|Async\\$\\w+)\\b"
);

var rtraceline = null;
var formatStack = null;

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function CapturedTrace(ignoreUntil, isTopLevel) {
    this.captureStackTrace(CapturedTrace, isTopLevel);

}
inherits(CapturedTrace, Error);

CapturedTrace.prototype.captureStackTrace =
function CapturedTrace$captureStackTrace(ignoreUntil, isTopLevel) {
    captureStackTrace(this, ignoreUntil, isTopLevel);
};

CapturedTrace.possiblyUnhandledRejection =
function CapturedTrace$PossiblyUnhandledRejection(reason) {
    if (typeof console === "object") {
        var message;
        if (typeof reason === "object" || typeof reason === "function") {
            var stack = reason.stack;
            message = "Possibly unhandled " + formatStack(stack, reason);
        } else {
            message = "Possibly unhandled " + String(reason);
        }
        if (typeof console.error === "function" ||
            typeof console.error === "object") {
            console.error(message);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.combine = function CapturedTrace$Combine(current, prev) {
    var curLast = current.length - 1;
    for (var i = prev.length - 1; i >= 0; --i) {
        var line = prev[i];
        if (current[curLast] === line) {
            current.pop();
            curLast--;
        } else {
            break;
        }
    }

    current.push("From previous event:");
    var lines = current.concat(prev);

    var ret = [];

    for (var i = 0, len = lines.length; i < len; ++i) {

        if ((rignore.test(lines[i]) ||
            (i > 0 && !rtraceline.test(lines[i])) &&
            lines[i] !== "From previous event:")
       ) {
            continue;
        }
        ret.push(lines[i]);
    }
    return ret;
};

CapturedTrace.isSupported = function CapturedTrace$IsSupported() {
    return typeof captureStackTrace === "function";
};

var captureStackTrace = (function stackDetection() {
    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        rtraceline = /^\s*at\s*/;
        formatStack = function(stack, error) {
            ASSERT((error !== null),
    "error !== null");

            if (typeof stack === "string") return stack;

            if (error.name !== void 0 &&
                error.message !== void 0) {
                return error.name + ". " + error.message;
            }
            return formatNonError(error);


        };
        var captureStackTrace = Error.captureStackTrace;
        return function CapturedTrace$_captureStackTrace(
            receiver, ignoreUntil) {
            captureStackTrace(receiver, ignoreUntil);
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        typeof "".startsWith === "function" &&
        (err.stack.startsWith("stackDetection@")) &&
        stackDetection.name === "stackDetection") {

        defineProperty(Error, "stackTraceLimit", {
            writable: true,
            enumerable: false,
            configurable: false,
            value: 25
        });
        rtraceline = /@/;
        var rline = /[@\n]/;

        formatStack = function(stack, error) {
            if (typeof stack === "string") {
                return (error.name + ". " + error.message + "\n" + stack);
            }

            if (error.name !== void 0 &&
                error.message !== void 0) {
                return error.name + ". " + error.message;
            }
            return formatNonError(error);
        };

        return function captureStackTrace(o) {
            var stack = new Error().stack;
            var split = stack.split(rline);
            var len = split.length;
            var ret = "";
            for (var i = 0; i < len; i += 2) {
                ret += split[i];
                ret += "@";
                ret += split[i + 1];
                ret += "\n";
            }
            o.stack = ret;
        };
    } else {
        formatStack = function(stack, error) {
            if (typeof stack === "string") return stack;

            if ((typeof error === "object" ||
                typeof error === "function") &&
                error.name !== void 0 &&
                error.message !== void 0) {
                return error.name + ". " + error.message;
            }
            return formatNonError(error);
        };

        return null;
    }
})();

return CapturedTrace;
};

},{"./assert.js":19,"./es5.js":30,"./util.js":53}],25:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(NEXT_FILTER) {
var util = require("./util.js");
var errors = require("./errors.js");
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;
var keys = require("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function CatchFilter$_safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch1(predicate, safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError(
            "Catch filter must inherit from Error "
          + "or be a simple predicate function");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function CatchFilter$_doFilter(e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._boundTo;
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch1(cb, boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = CatchFilter$_safePredicate(item, e);
            if (shouldHandle === errorObj) {
                var trace = errors.canAttach(errorObj.e)
                    ? errorObj.e
                    : new Error(errorObj.e + "");
                this._promise._attachExtraTrace(trace);
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch1(cb, boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":28,"./es5.js":30,"./util.js":53}],26:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var util = require("./util.js");
var ASSERT = require("./assert.js");
var isPrimitive = util.isPrimitive;
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;

module.exports = function(Promise) {
var returner = function Promise$_returner() {
    return this;
};
var thrower = function Promise$_thrower() {
    throw this;
};

var wrapper = function Promise$_wrapper(value, action) {
    if (action === 1) {
        return function Promise$_thrower() {
            throw value;
        };
    } else if (action === 2) {
        return function Promise$_returner() {
            return value;
        };
    }
    ASSERT(false,
    "false");
};


Promise.prototype["return"] =
Promise.prototype.thenReturn =
function Promise$thenReturn(value) {
    if (wrapsPrimitiveReceiver && isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            void 0,
            void 0,
            void 0,
            void 0
       );
    }
    return this._then(returner, void 0, void 0, value, void 0);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow =
function Promise$thenThrow(reason) {
    if (wrapsPrimitiveReceiver && isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            void 0,
            void 0,
            void 0,
            void 0
       );
    }
    return this._then(thrower, void 0, void 0, reason, void 0);
};
};

},{"./assert.js":19,"./util.js":53}],27:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;

Promise.prototype.each = function Promise$each(fn) {
    return PromiseReduce(this, fn, null, INTERNAL);
};

Promise.each = function Promise$Each(promises, fn) {
    return PromiseReduce(promises, fn, null, INTERNAL);
};
};

},{}],28:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var Objectfreeze = require("./es5.js").freeze;
var util = require("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof OperationalError) ||
        e["isOperational"] === true);
}

function isError(obj) {
    return obj instanceof Error;
}

function canAttach(obj) {
    return isError(obj);
}

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        this.message = typeof message === "string" ? message : defaultMessage;
        this.name = nameProperty;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

AggregateError.prototype.length = 0;
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    this.name = "OperationalError";
    this.message = message;
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        this.message = message.message;
        this.stack = message.stack;
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var key = "__BluebirdErrorTypes__";
var errorTypes = Error[key];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, key, errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    canAttach: canAttach
};

},{"./es5.js":30,"./util.js":53}],29:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
var TypeError = require('./errors.js').TypeError;

function apiRejection(msg) {
    var error = new TypeError(msg);
    var ret = Promise.rejected(error);
    var parent = ret._peekContext();
    if (parent != null) {
        parent._attachExtraTrace(error);
    }
    return ret;
}

return apiRejection;
};

},{"./errors.js":28}],30:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
var isES5 = (function(){
    "use strict";
    return this === void 0;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        keys: Object.keys,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function ObjectKeys(o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    }

    var ObjectDefineProperty = function ObjectDefineProperty(o, key, desc) {
        o[key] = desc.value;
        return o;
    }

    var ObjectFreeze = function ObjectFreeze(obj) {
        return obj;
    }

    var ObjectGetPrototypeOf = function ObjectGetPrototypeOf(obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    }

    var ArrayIsArray = function ArrayIsArray(obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    }

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5
    };
}

},{}],31:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function Promise$filter(fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function Promise$Filter(promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],32:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, NEXT_FILTER, cast) {
var util = require("./util.js");
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;

function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function Promise$_returner() {
        return r;
    };
}
function throw$(r) {
    return function Promise$_thrower() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (wrapsPrimitiveReceiver && isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    } else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, void 0, reasonOrValue, void 0);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo)
                    : handler();

    if (ret !== void 0) {
        var maybePromise = cast(ret, void 0);
        if (maybePromise instanceof Promise) {
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    } else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo, value)
                    : handler(value);

    if (ret !== void 0) {
        var maybePromise = cast(ret, void 0);
        if (maybePromise instanceof Promise) {
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler =
function Promise$_passThroughHandler(handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : void 0, void 0,
            promiseAndHandler, void 0);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function Promise$finally(handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function Promise$tap(handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":53}],33:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, apiRejection, INTERNAL, cast) {
var errors = require("./errors.js");
var TypeError = errors.TypeError;
var ASSERT = require("./assert.js");
var deprecated = require("./util.js").deprecated;
var util = require("./util.js");
var errorObj = util.errorObj;
var tryCatch1 = util.tryCatch1;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers) {
    var _errorObj = errorObj;
    var _Promise = Promise;
    var len = yieldHandlers.length;
    for (var i = 0; i < len; ++i) {
        var result = tryCatch1(yieldHandlers[i], void 0, value);
        if (result === _errorObj) {
            return _Promise.reject(_errorObj.e);
        }
        var maybePromise = cast(result, promiseFromYieldHandler);
        if (maybePromise instanceof _Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._setTrace(void 0);
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = void 0;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
}

PromiseSpawn.prototype.promise = function PromiseSpawn$promise() {
    return this._promise;
};

PromiseSpawn.prototype._run = function PromiseSpawn$_run() {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = void 0;
    this._next(void 0);
};

PromiseSpawn.prototype._continue = function PromiseSpawn$_continue(result) {
    if (result === errorObj) {
        this._generator = void 0;
        var trace = errors.canAttach(result.e)
            ? result.e : new Error(result.e + "");
        this._promise._attachExtraTrace(trace);
        this._promise._reject(result.e, trace);
        return;
    }

    var value = result.value;
    if (result.done === true) {
        this._generator = void 0;
        if (!this._promise._tryFollow(value)) {
            this._promise._fulfill(value);
        }
    } else {
        var maybePromise = cast(value, void 0);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise, this._yieldHandlers);
            ASSERT(((maybePromise === null) || (maybePromise instanceof Promise)),
    "maybePromise === null || maybePromise instanceof Promise");
            if (maybePromise === null) {
                this._throw(new TypeError("A value was yielded that could not be treated as a promise"));
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            void 0,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function PromiseSpawn$_throw(reason) {
    if (errors.canAttach(reason))
        this._promise._attachExtraTrace(reason);
    this._continue(
        tryCatch1(this._generator["throw"], this._generator, reason)
   );
};

PromiseSpawn.prototype._next = function PromiseSpawn$_next(value) {
    this._continue(
        tryCatch1(this._generator.next, this._generator, value)
   );
};

Promise.coroutine =
function Promise$Coroutine(generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(void 0, void 0, yieldHandler);
        spawn._generator = generator;
        spawn._next(void 0);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function");
    yieldHandlers.push(fn);
};

Promise.spawn = function Promise$Spawn(generatorFunction) {
    deprecated("Promise.spawn is deprecated. Use Promise.coroutine instead.");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./assert.js":19,"./errors.js":28,"./util.js":53}],34:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports =
function(Promise, PromiseArray, cast, INTERNAL) {
var util = require("./util.js");
var canEvaluate = util.canEvaluate;
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;


if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var caller = function(count) {
        var values = [];
        for (var i = 1; i <= count; ++i) values.push("holder.p" + i);
        return new Function("holder", "                                      \n\
            'use strict';                                                    \n\
            var callback = holder.fn;                                        \n\
            return callback(values);                                         \n\
            ".replace(/values/g, values.join(", ")));
    };
    var thenCallbacks = [];
    var callers = [void 0];
    for (var i = 1; i <= 5; ++i) {
        thenCallbacks.push(thenCallback(i));
        callers.push(caller(i));
    }

    var Holder = function(total, fn) {
        this.p1 = this.p2 = this.p3 = this.p4 = this.p5 = null;
        this.fn = fn;
        this.total = total;
        this.now = 0;
    };

    Holder.prototype.callers = callers;
    Holder.prototype.checkFulfillment = function(promise) {
        var now = this.now;
        now++;
        var total = this.total;
        if (now >= total) {
            var handler = this.callers[total];
            var ret = tryCatch1(handler, void 0, this);
            if (ret === errorObj) {
                promise._rejectUnchecked(ret.e);
            } else if (!promise._tryFollow(ret)) {
                promise._fulfillUnchecked(ret);
            }
        } else {
            this.now = now;
        }
    };
}




Promise.join = function Promise$Join() {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (last < 6 && canEvaluate) {
            var ret = new Promise(INTERNAL);
            ret._setTrace(void 0);
            var holder = new Holder(last, fn);
            var reject = ret._reject;
            var callbacks = thenCallbacks;
            for (var i = 0; i < last; ++i) {
                var maybePromise = cast(arguments[i], void 0);
                if (maybePromise instanceof Promise) {
                    if (maybePromise.isPending()) {
                        maybePromise._then(callbacks[i], reject,
                                           void 0, ret, holder);
                    } else if (maybePromise.isFulfilled()) {
                        callbacks[i].call(ret,
                                          maybePromise._settledValue, holder);
                    } else {
                        ret._reject(maybePromise._settledValue);
                        maybePromise._unsetRejectionIsUnhandled();
                    }
                } else {
                    callbacks[i].call(ret, maybePromise, holder);
                }
            }
            return ret;
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    var ret = new PromiseArray(args).promise();
    return fn !== void 0 ? ret.spread(fn) : ret;
};

};

},{"./util.js":53}],35:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, cast, INTERNAL) {
var util = require("./util.js");
var tryCatch3 = util.tryCatch3;
var errorObj = util.errorObj;
var PENDING = {};
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._callback = fn;
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    this._init$(void 0, -2);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._init = function MappingPromiseArray$_init() {};

MappingPromiseArray.prototype._promiseFulfilled =
function MappingPromiseArray$_promiseFulfilled(value, index) {
    var values = this._values;
    if (values === null) return;

    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;
    if (values[index] === PENDING) {
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var callback = this._callback;
        var receiver = this._promise._boundTo;
        var ret = tryCatch3(callback, receiver, value, index, length);
        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = cast(ret, void 0);
        if (maybePromise instanceof Promise) {
            if (maybePromise.isPending()) {
                if (limit >= 1) this._inFlight++;
                values[index] = PENDING;
                return maybePromise._proxyPromiseArray(this, index);
            } else if (maybePromise.isFulfilled()) {
                ret = maybePromise.value();
            } else {
                maybePromise._unsetRejectionIsUnhandled();
                return this._reject(maybePromise.reason());
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }

    }
};

MappingPromiseArray.prototype._drainQueue =
function MappingPromiseArray$_drainQueue() {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter =
function MappingPromiseArray$_filter(booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues =
function MappingPromiseArray$preserveValues() {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter);
}

Promise.prototype.map = function Promise$map(fn, options) {
    if (typeof fn !== "function") return apiRejection("fn must be a function");

    return map(this, fn, options, null).promise();
};

Promise.map = function Promise$Map(promises, fn, options, _filter) {
    if (typeof fn !== "function") return apiRejection("fn must be a function");
    return map(promises, fn, options, _filter).promise();
};


};

},{"./util.js":53}],36:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
var util = require("./util.js");
var async = require("./async.js");
var ASSERT = require("./assert.js");
var tryCatch2 = util.tryCatch2;
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;

function thrower(r) {
    throw r;
}

function Promise$_spreadAdapter(val, receiver) {
    if (!util.isArray(val)) return Promise$_successAdapter(val, receiver);
    var ret = util.tryCatchApply(this, [null].concat(val), receiver);
    if (ret === errorObj) {
        async.invokeLater(thrower, void 0, ret.e);
    }
}

function Promise$_successAdapter(val, receiver) {
    var nodeback = this;
    ASSERT(((typeof nodeback) == "function"),
    "typeof nodeback == \u0022function\u0022");
    var ret = val === void 0
        ? tryCatch1(nodeback, receiver, null)
        : tryCatch2(nodeback, receiver, null, val);
    if (ret === errorObj) {
        async.invokeLater(thrower, void 0, ret.e);
    }
}
function Promise$_errorAdapter(reason, receiver) {
    var nodeback = this;
    ASSERT(((typeof nodeback) == "function"),
    "typeof nodeback == \u0022function\u0022");
    var ret = tryCatch1(nodeback, receiver, reason);
    if (ret === errorObj) {
        async.invokeLater(thrower, void 0, ret.e);
    }
}

Promise.prototype.nodeify = function Promise$nodeify(nodeback, options) {
    if (typeof nodeback == "function") {
        var adapter = Promise$_successAdapter;
        if (options !== void 0 && Object(options).spread) {
            adapter = Promise$_spreadAdapter;
        }
        this._then(
            adapter,
            Promise$_errorAdapter,
            void 0,
            nodeback,
            this._boundTo
        );
    }
    return this;
};
};

},{"./assert.js":19,"./async.js":20,"./util.js":53}],37:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray) {
var ASSERT = require("./assert.js");
var util = require("./util.js");
var async = require("./async.js");
var errors = require("./errors.js");
var tryCatch1 = util.tryCatch1;
var errorObj = util.errorObj;

Promise.prototype.progressed = function Promise$progressed(handler) {
    return this._then(void 0, void 0, handler, void 0, void 0);
};

Promise.prototype._progress = function Promise$_progress(progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt =
function Promise$_progressHandlerAt(index) {
    return index === 0
        ? this._progressHandler0
        : this[(index << 2) + index - 5 + 2];
};

Promise.prototype._doProgressWith =
function Promise$_doProgressWith(progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    ASSERT(((typeof handler) === "function"),
    "typeof handler === \u0022function\u0022");
    ASSERT((promise instanceof Promise),
    "promise instanceof Promise");
    var ret = tryCatch1(handler, receiver, progressValue);
    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = errors.canAttach(ret.e)
                ? ret.e : new Error(ret.e + "");
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    } else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, void 0);
    } else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked =
function Promise$_progressUnchecked(progressValue) {
    if (!this.isPending()) return;
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i++) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            } else if (receiver instanceof Promise && receiver._isProxied()) {
                receiver._progressUnchecked(progressValue);
            } else if (receiver instanceof PromiseArray) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        } else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./assert.js":19,"./async.js":20,"./errors.js":28,"./util.js":53}],38:[function(require,module,exports){
var process=require("__browserify_process");/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict(bluebird) {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
module.exports = function() {
var ASSERT = require("./assert.js");
var util = require("./util.js");
var async = require("./async.js");
var errors = require("./errors.js");

var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};

var cast = require("./thenables.js")(Promise, INTERNAL);
var PromiseArray = require("./promise_array.js")(Promise, INTERNAL, cast);
var CapturedTrace = require("./captured_trace.js")();
var CatchFilter = require("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = require("./promise_resolver.js");

var isArray = util.isArray;

var errorObj = util.errorObj;
var tryCatch1 = util.tryCatch1;
var tryCatch2 = util.tryCatch2;
var tryCatchApply = util.tryCatchApply;
var RangeError = errors.RangeError;
var TypeError = errors.TypeError;
var CancellationError = errors.CancellationError;
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var originatesFromRejection = errors.originatesFromRejection;
var markAsOriginatingFromRejection = errors.markAsOriginatingFromRejection;
var canAttach = errors.canAttach;
var thrower = util.thrower;
var apiRejection = require("./errors_api_rejection")(Promise);


var makeSelfResolutionError = function Promise$_makeSelfResolutionError() {
    return new TypeError("circular promise resolution chain");
};

function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = void 0;
    this._rejectionHandler0 = void 0;
    this._promise0 = void 0;
    this._receiver0 = void 0;
    this._settledValue = void 0;
    this._boundTo = void 0;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.bind = function Promise$bind(thisArg) {
    var ret = new Promise(INTERNAL);
    ret._follow(this);
    ret._propagateFrom(this, 2 | 1);
    ret._setBoundTo(thisArg);
    return ret;
};

Promise.prototype.toString = function Promise$toString() {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] =
function Promise$catch(fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            } else {
                var catchFilterTypeError =
                    new TypeError(
                        "A catch filter must be an error constructor "
                        + "or a filter function");

                this._attachExtraTrace(catchFilterTypeError);
                async.invoke(this._reject, this, catchFilterTypeError);
                return;
            }
        }
        catchInstances.length = j;
        fn = arguments[i];

        this._resetTrace();
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(void 0, catchFilter.doFilter, void 0,
            catchFilter, void 0);
    }
    return this._then(void 0, fn, void 0, void 0, void 0);
};

Promise.prototype.then =
function Promise$then(didFulfill, didReject, didProgress) {
    return this._then(didFulfill, didReject, didProgress,
        void 0, void 0);
};


Promise.prototype.done =
function Promise$done(didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        void 0, void 0);
    promise._setIsFinal();
};

Promise.prototype.spread = function Promise$spread(didFulfill, didReject) {
    return this._then(didFulfill, didReject, void 0,
        APPLY, void 0);
};

Promise.prototype.isCancellable = function Promise$isCancellable() {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function Promise$toJSON() {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: void 0,
        rejectionReason: void 0
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this._settledValue;
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this._settledValue;
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function Promise$all() {
    return new PromiseArray(this).promise();
};


Promise.is = function Promise$Is(val) {
    return val instanceof Promise;
};

Promise.all = function Promise$All(promises) {
    return new PromiseArray(promises).promise();
};

Promise.prototype.error = function Promise$_error(fn) {
    return this.caught(originatesFromRejection, fn);
};

Promise.prototype._resolveFromSyncValue =
function Promise$_resolveFromSyncValue(value) {
    if (value === errorObj) {
        this._cleanValues();
        this._setRejected();
        this._settledValue = value.e;
        this._ensurePossibleRejectionHandled();
    } else {
        var maybePromise = cast(value, void 0);
        if (maybePromise instanceof Promise) {
            this._follow(maybePromise);
        } else {
            this._cleanValues();
            this._setFulfilled();
            this._settledValue = value;
        }
    }
};

Promise.method = function Promise$_Method(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function");
    }
    return function Promise$_method() {
        var value;
        switch(arguments.length) {
        case 0: value = tryCatch1(fn, this, void 0); break;
        case 1: value = tryCatch1(fn, this, arguments[0]); break;
        case 2: value = tryCatch2(fn, this, arguments[0], arguments[1]); break;
        default:
            var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
            value = tryCatchApply(fn, args, this); break;
        }
        var ret = new Promise(INTERNAL);
        ret._setTrace(void 0);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function Promise$_Try(fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function");
    }
    var value = isArray(args)
        ? tryCatchApply(fn, args, ctx)
        : tryCatch1(fn, ctx, args);

    var ret = new Promise(INTERNAL);
    ret._setTrace(void 0);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.defer = Promise.pending = function Promise$Defer() {
    var promise = new Promise(INTERNAL);
    promise._setTrace(void 0);
    return new PromiseResolver(promise);
};

Promise.bind = function Promise$Bind(thisArg) {
    var ret = new Promise(INTERNAL);
    ret._setTrace(void 0);
    ret._setFulfilled();
    ret._setBoundTo(thisArg);
    return ret;
};

Promise.cast = function Promise$_Cast(obj) {
    var ret = cast(obj, void 0);
    if (!(ret instanceof Promise)) {
        var val = ret;
        ret = new Promise(INTERNAL);
        ret._setTrace(void 0);
        ret._setFulfilled();
        ret._cleanValues();
        ret._settledValue = val;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function Promise$Reject(reason) {
    var ret = new Promise(INTERNAL);
    ret._setTrace(void 0);
    markAsOriginatingFromRejection(reason);
    ret._cleanValues();
    ret._setRejected();
    ret._settledValue = reason;
    if (!canAttach(reason)) {
        var trace = new Error(reason + "");
        ret._setCarriedStackTrace(trace);
    }
    ret._ensurePossibleRejectionHandled();
    return ret;
};

Promise.onPossiblyUnhandledRejection =
function Promise$OnPossiblyUnhandledRejection(fn) {
        CapturedTrace.possiblyUnhandledRejection = typeof fn === "function"
                                                    ? fn : void 0;
};

var unhandledRejectionHandled;
Promise.onUnhandledRejectionHandled =
function Promise$onUnhandledRejectionHandled(fn) {
    unhandledRejectionHandled = typeof fn === "function" ? fn : void 0;
};

var debugging = true || !!(
    typeof process !== "undefined" &&
    typeof process.execPath === "string" &&
    typeof process.env === "object" &&
    (process.env["BLUEBIRD_DEBUG"] ||
        process.env["NODE_ENV"] === "development")
);


Promise.longStackTraces = function Promise$LongStackTraces() {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created");
    }
    debugging = CapturedTrace.isSupported();
};

Promise.hasLongStackTraces = function Promise$HasLongStackTraces() {
    return debugging && CapturedTrace.isSupported();
};

Promise.prototype._then =
function Promise$_then(
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    ASSERT((arguments.length === 5),
    "arguments.length === 5");
    var haveInternalData = internalData !== void 0;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (!haveInternalData) {
        if (debugging) {
            var haveSameContext = this._peekContext() === this._traceParent;
            ret._traceParent = haveSameContext ? this._traceParent : this;
        }
        ret._propagateFrom(this, 7);
    }

    var callbackIndex =
        this._addCallbacks(didFulfill, didReject, didProgress, ret, receiver);

    if (this.isResolved()) {
        async.invoke(this._queueSettleAt, this, callbackIndex);
    }

    return ret;
};

Promise.prototype._length = function Promise$_length() {
    ASSERT((arguments.length === 0),
    "arguments.length === 0");
    return this._bitField & 262143;
};

Promise.prototype._isFollowingOrFulfilledOrRejected =
function Promise$_isFollowingOrFulfilledOrRejected() {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function Promise$_isFollowing() {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function Promise$_setLength(len) {
    this._bitField = (this._bitField & -262144) |
        (len & 262143);
};

Promise.prototype._setFulfilled = function Promise$_setFulfilled() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function Promise$_setRejected() {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function Promise$_setFollowing() {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function Promise$_setIsFinal() {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function Promise$_isFinal() {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function Promise$_cancellable() {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function Promise$_setCancellable() {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function Promise$_unsetCancellable() {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setRejectionIsUnhandled =
function Promise$_setRejectionIsUnhandled() {
    ASSERT(this.isRejected(),
    "this.isRejected()");
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled =
function Promise$_unsetRejectionIsUnhandled() {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled =
function Promise$_isRejectionUnhandled() {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setUnhandledRejectionIsNotified =
function Promise$_setUnhandledRejectionIsNotified() {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified =
function Promise$_unsetUnhandledRejectionIsNotified() {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified =
function Promise$_isUnhandledRejectionNotified() {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setCarriedStackTrace =
function Promise$_setCarriedStackTrace(capturedTrace) {
    ASSERT(this.isRejected(),
    "this.isRejected()");
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._unsetCarriedStackTrace =
function Promise$_unsetCarriedStackTrace() {
    ASSERT(this.isRejected(),
    "this.isRejected()");
    this._bitField = this._bitField & (~1048576);
    this._fulfillmentHandler0 = void 0;
};

Promise.prototype._isCarryingStackTrace =
function Promise$_isCarryingStackTrace() {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace =
function Promise$_getCarriedStackTrace() {
    ASSERT(this.isRejected(),
    "this.isRejected()");
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : void 0;
};

Promise.prototype._receiverAt = function Promise$_receiverAt(index) {
    var ret = index === 0
        ? this._receiver0
        : this[(index << 2) + index - 5 + 4];
    if (this._isBound() && ret === void 0) {
        return this._boundTo;
    }
    return ret;
};

Promise.prototype._promiseAt = function Promise$_promiseAt(index) {
    return index === 0
        ? this._promise0
        : this[(index << 2) + index - 5 + 3];
};

Promise.prototype._fulfillmentHandlerAt =
function Promise$_fulfillmentHandlerAt(index) {
    ASSERT((! this._isCarryingStackTrace()),
    "!this._isCarryingStackTrace()");
    return index === 0
        ? this._fulfillmentHandler0
        : this[(index << 2) + index - 5 + 0];
};

Promise.prototype._rejectionHandlerAt =
function Promise$_rejectionHandlerAt(index) {
    return index === 0
        ? this._rejectionHandler0
        : this[(index << 2) + index - 5 + 1];
};

Promise.prototype._addCallbacks = function Promise$_addCallbacks(
    fulfill,
    reject,
    progress,
    promise,
    receiver
) {
    var index = this._length();

    if (index >= 262143 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== void 0) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace())
            this._fulfillmentHandler0 = fulfill;
        if (typeof reject === "function") this._rejectionHandler0 = reject;
        if (typeof progress === "function") this._progressHandler0 = progress;
    } else {
        var base = (index << 2) + index - 5;
        this[base + 3] = promise;
        this[base + 4] = receiver;
        this[base + 0] = typeof fulfill === "function"
                                            ? fulfill : void 0;
        this[base + 1] = typeof reject === "function"
                                            ? reject : void 0;
        this[base + 2] = typeof progress === "function"
                                            ? progress : void 0;
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._setProxyHandlers =
function Promise$_setProxyHandlers(receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 262143 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    } else {
        var base = (index << 2) + index - 5;
        this[base + 3] = promiseSlotValue;
        this[base + 4] = receiver;
        this[base + 0] =
        this[base + 1] =
        this[base + 2] = void 0;
    }
    this._setLength(index + 1);
};

Promise.prototype._proxyPromiseArray =
function Promise$_proxyPromiseArray(promiseArray, index) {
    ASSERT((! this.isResolved()),
    "!this.isResolved()");
    ASSERT((arguments.length === 2),
    "arguments.length === 2");
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT(((index | 0) === index),
    "(index | 0) === index");
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._proxyPromise = function Promise$_proxyPromise(promise) {
    ASSERT((! promise._isProxied()),
    "!promise._isProxied()");
    ASSERT((! this.isResolved()),
    "!this.isResolved()");
    ASSERT((arguments.length === 1),
    "arguments.length === 1");
    promise._setProxied();
    this._setProxyHandlers(promise, -1);
};

Promise.prototype._setBoundTo = function Promise$_setBoundTo(obj) {
    if (obj !== void 0) {
        this._bitField = this._bitField | 8388608;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~8388608);
    }
};

Promise.prototype._isBound = function Promise$_isBound() {
    return (this._bitField & 8388608) === 8388608;
};

Promise.prototype._resolveFromResolver =
function Promise$_resolveFromResolver(resolver) {
    ASSERT(((typeof resolver) === "function"),
    "typeof resolver === \u0022function\u0022");
    var promise = this;
    this._setTrace(void 0);
    this._pushContext();

    function Promise$_resolver(val) {
        if (promise._tryFollow(val)) {
            return;
        }
        promise._fulfill(val);
    }
    function Promise$_rejecter(val) {
        var trace = canAttach(val) ? val : new Error(val + "");
        promise._attachExtraTrace(trace);
        markAsOriginatingFromRejection(val);
        promise._reject(val, trace === val ? void 0 : trace);
    }
    var r = tryCatch2(resolver, void 0, Promise$_resolver, Promise$_rejecter);
    this._popContext();

    if (r !== void 0 && r === errorObj) {
        var e = r.e;
        var trace = canAttach(e) ? e : new Error(e + "");
        promise._reject(e, trace);
    }
};

Promise.prototype._spreadSlowCase =
function Promise$_spreadSlowCase(targetFn, promise, values, boundTo) {
    ASSERT(isArray(values),
    "isArray(values)");
    ASSERT(((typeof targetFn) === "function"),
    "typeof targetFn === \u0022function\u0022");
    var promiseForAll = new PromiseArray(values).promise();
    var promise2 = promiseForAll._then(function() {
        return targetFn.apply(boundTo, arguments);
    }, void 0, void 0, APPLY, void 0);
    promise._follow(promise2);
};

Promise.prototype._callSpread =
function Promise$_callSpread(handler, promise, value) {
    var boundTo = this._boundTo;
    if (isArray(value)) {
        for (var i = 0, len = value.length; i < len; ++i) {
            if (cast(value[i], void 0) instanceof Promise) {
                this._spreadSlowCase(handler, promise, value, boundTo);
                return;
            }
        }
    }
    promise._pushContext();
    return tryCatchApply(handler, value, boundTo);
};

Promise.prototype._callHandler =
function Promise$_callHandler(
    handler, receiver, promise, value) {
    var x;
    if (receiver === APPLY && !this.isRejected()) {
        x = this._callSpread(handler, promise, value);
    } else {
        promise._pushContext();
        x = tryCatch1(handler, receiver, value);
    }
    promise._popContext();
    return x;
};

Promise.prototype._settlePromiseFromHandler =
function Promise$_settlePromiseFromHandler(
    handler, receiver, value, promise
) {
    if (!(promise instanceof Promise)) {
        handler.call(receiver, value, promise);
        return;
    }
    var x = this._callHandler(handler, receiver, promise, value);
    if (promise._isFollowing()) return;

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise
                    ? makeSelfResolutionError()
                    : x.e;
        var trace = canAttach(err) ? err : new Error(err + "");
        if (x !== NEXT_FILTER) promise._attachExtraTrace(trace);
        promise._rejectUnchecked(err, trace);
    } else {
        var castValue = cast(x, promise);
        if (castValue instanceof Promise) {
            if (castValue.isRejected() &&
                !castValue._isCarryingStackTrace() &&
                !canAttach(castValue._settledValue)) {
                var trace = new Error(castValue._settledValue + "");
                promise._attachExtraTrace(trace);
                castValue._setCarriedStackTrace(trace);
            }
            promise._follow(castValue);
            promise._propagateFrom(castValue, 1);
        } else {
            promise._fulfillUnchecked(x);
        }
    }
};

Promise.prototype._follow =
function Promise$_follow(promise) {
    ASSERT((arguments.length === 1),
    "arguments.length === 1");
    ASSERT((this._isFollowingOrFulfilledOrRejected() === false),
    "this._isFollowingOrFulfilledOrRejected() === false");
    ASSERT((promise !== this),
    "promise !== this");
    this._setFollowing();

    if (promise.isPending()) {
        this._propagateFrom(promise, 1);
        promise._proxyPromise(this);
    } else if (promise.isFulfilled()) {
        this._fulfillUnchecked(promise._settledValue);
    } else {
        this._rejectUnchecked(promise._settledValue,
            promise._getCarriedStackTrace());
    }

    if (promise._isRejectionUnhandled()) promise._unsetRejectionIsUnhandled();

    if (debugging &&
        promise._traceParent == null) {
        promise._traceParent = this;
    }
};

Promise.prototype._tryFollow =
function Promise$_tryFollow(value) {
    ASSERT((arguments.length === 1),
    "arguments.length === 1");
    if (this._isFollowingOrFulfilledOrRejected() ||
        value === this) {
        return false;
    }
    var maybePromise = cast(value, void 0);
    if (!(maybePromise instanceof Promise)) {
        return false;
    }
    this._follow(maybePromise);
    return true;
};

Promise.prototype._resetTrace = function Promise$_resetTrace() {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext() === void 0);
    }
};

Promise.prototype._setTrace = function Promise$_setTrace(parent) {
    ASSERT((this._trace == null),
    "this._trace == null");
    if (debugging) {
        var context = this._peekContext();
        this._traceParent = context;
        var isTopLevel = context === void 0;
        if (parent !== void 0 &&
            parent._traceParent === context) {
            ASSERT((parent._trace != null),
    "parent._trace != null");
            this._trace = parent._trace;
        } else {
            this._trace = new CapturedTrace(isTopLevel);
        }
    }
    return this;
};

Promise.prototype._attachExtraTrace =
function Promise$_attachExtraTrace(error) {
    if (debugging) {
        ASSERT(canAttach(error),
    "canAttach(error)");
        var promise = this;
        var stack = error.stack;
        stack = typeof stack === "string"
            ? stack.split("\n") : [];
        var headerLineCount = 1;
        var combinedTraces = 1;
        while(promise != null &&
            promise._trace != null) {
            stack = CapturedTrace.combine(
                stack,
                promise._trace.stack.split("\n")
            );
            promise = promise._traceParent;
            combinedTraces++;
        }

        var stackTraceLimit = Error.stackTraceLimit || 10;
        var max = (stackTraceLimit + headerLineCount) * combinedTraces;
        var len = stack.length;
        if (len  > max) {
            stack.length = max;
        }
        if (stack.length <= headerLineCount) {
            error.stack = "(No stack trace)";
        } else {
            error.stack = stack.join("\n");
        }
    }
};

Promise.prototype._cleanValues = function Promise$_cleanValues() {
    if (this._cancellable()) {
        this._cancellationParent = void 0;
    }
};

Promise.prototype._propagateFrom =
function Promise$_propagateFrom(parent, flags) {
    if ((flags & 1) > 0 && parent._cancellable()) {
        this._setCancellable();
        this._cancellationParent = parent;
    }
    if ((flags & 4) > 0) {
        this._setBoundTo(parent._boundTo);
    }
    if ((flags & 2) > 0) {
        this._setTrace(parent);
    }
};

Promise.prototype._fulfill = function Promise$_fulfill(value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject =
function Promise$_reject(reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function Promise$_settlePromiseAt(index) {
    var handler = this.isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    ASSERT((this.isFulfilled() || this.isRejected()),
    "this.isFulfilled() || this.isRejected()");

    var value = this._settledValue;
    var receiver = this._receiverAt(index);
    var promise = this._promiseAt(index);

    if (typeof handler === "function") {
        this._settlePromiseFromHandler(handler, receiver, value, promise);
    } else {
        var done = false;
        var isFulfilled = this.isFulfilled();
        if (receiver !== void 0) {
            if (receiver instanceof Promise &&
                receiver._isProxied()) {
                receiver._unsetProxied();

                if (isFulfilled) receiver._fulfillUnchecked(value);
                else receiver._rejectUnchecked(value,
                    this._getCarriedStackTrace());
                done = true;
            } else if (receiver instanceof PromiseArray) {
                if (isFulfilled) receiver._promiseFulfilled(value, promise);
                else receiver._promiseRejected(value, promise);
                done = true;
            }
        }

        if (!done) {
            if (isFulfilled) promise._fulfill(value);
            else promise._reject(value, this._getCarriedStackTrace());
        }
    }

    if (index >= 256) {
        this._queueGC();
    }
};

Promise.prototype._isProxied = function Promise$_isProxied() {
    return (this._bitField & 4194304) === 4194304;
};

Promise.prototype._setProxied = function Promise$_setProxied() {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetProxied = function Promise$_unsetProxied() {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isGcQueued = function Promise$_isGcQueued() {
    return (this._bitField & -1073741824) === -1073741824;
};

Promise.prototype._setGcQueued = function Promise$_setGcQueued() {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetGcQueued = function Promise$_unsetGcQueued() {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueGC = function Promise$_queueGC() {
    if (this._isGcQueued()) return;
    this._setGcQueued();
    async.invokeLater(this._gc, this, void 0);
};

Promise.prototype._gc = function Promise$gc() {
    var len = this._length() * 5;
    for (var i = 0; i < len; i++) {
        delete this[i];
    }
    this._setLength(0);
    this._unsetGcQueued();
};

Promise.prototype._queueSettleAt = function Promise$_queueSettleAt(index) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT((index >= 0),
    "index >= 0");
    ASSERT((this.isFulfilled() || this.isRejected()),
    "this.isFulfilled() || this.isRejected()");
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    async.invoke(this._settlePromiseAt, this, index);
};

Promise.prototype._fulfillUnchecked =
function Promise$_fulfillUnchecked(value) {
    if (!this.isPending()) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, void 0);
    }
    this._cleanValues();
    this._setFulfilled();
    this._settledValue = value;
    var len = this._length();

    if (len > 0) {
        async.invoke(this._settlePromises, this, len);
    }
};

Promise.prototype._rejectUncheckedCheckError =
function Promise$_rejectUncheckedCheckError(reason) {
    var trace = canAttach(reason) ? reason : new Error(reason + "");
    this._rejectUnchecked(reason, trace === reason ? void 0 : trace);
};

Promise.prototype._rejectUnchecked =
function Promise$_rejectUnchecked(reason, trace) {
    if (!this.isPending()) return;
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._cleanValues();
    this._setRejected();
    this._settledValue = reason;

    if (this._isFinal()) {
        ASSERT((this._length() === 0),
    "this._length() === 0");
        async.invokeLater(thrower, void 0, trace === void 0 ? reason : trace);
        return;
    }
    var len = this._length();

    if (trace !== void 0) this._setCarriedStackTrace(trace);

    if (len > 0) {
        async.invoke(this._rejectPromises, this, null);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._rejectPromises = function Promise$_rejectPromises() {
    this._settlePromises();
    this._unsetCarriedStackTrace();
};

Promise.prototype._settlePromises = function Promise$_settlePromises() {
    var len = this._length();
    for (var i = 0; i < len; i++) {
        this._settlePromiseAt(i);
    }
};

Promise.prototype._ensurePossibleRejectionHandled =
function Promise$_ensurePossibleRejectionHandled() {
    this._setRejectionIsUnhandled();
    if (CapturedTrace.possiblyUnhandledRejection !== void 0) {
        async.invokeLater(this._notifyUnhandledRejection, this, void 0);
    }
};

Promise.prototype._notifyUnhandledRejectionIsHandled =
function Promise$_notifyUnhandledRejectionIsHandled() {
    if (typeof unhandledRejectionHandled === "function") {
        async.invokeLater(unhandledRejectionHandled, void 0, this);
    }
};

Promise.prototype._notifyUnhandledRejection =
function Promise$_notifyUnhandledRejection() {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue;
        var trace = this._getCarriedStackTrace();

        this._setUnhandledRejectionIsNotified();

        if (trace !== void 0) {
            this._unsetCarriedStackTrace();
            reason = trace;
        }
        if (typeof CapturedTrace.possiblyUnhandledRejection === "function") {
            CapturedTrace.possiblyUnhandledRejection(reason, this);
        }
    }
};

var contextStack = [];
Promise.prototype._peekContext = function Promise$_peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return void 0;

};

Promise.prototype._pushContext = function Promise$_pushContext() {
    if (!debugging) return;
    contextStack.push(this);
};

Promise.prototype._popContext = function Promise$_popContext() {
    if (!debugging) return;
    contextStack.pop();
};

Promise.noConflict = function Promise$NoConflict() {
    return noConflict(Promise);
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function");
    async._schedule = fn;
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

Promise._makeSelfResolutionError = makeSelfResolutionError;
require("./finally.js")(Promise, NEXT_FILTER, cast);
require("./direct_resolve.js")(Promise);
require("./synchronous_inspection.js")(Promise);
require("./join.js")(Promise, PromiseArray, cast, INTERNAL);
Promise.RangeError = RangeError;
Promise.CancellationError = CancellationError;
Promise.TimeoutError = TimeoutError;
Promise.TypeError = TypeError;
Promise.OperationalError = OperationalError;
Promise.RejectionError = OperationalError;
Promise.AggregateError = errors.AggregateError;

util.toFastProperties(Promise);
util.toFastProperties(Promise.prototype);
Promise.Promise = Promise;
require('./timers.js')(Promise,INTERNAL,cast);
require('./race.js')(Promise,INTERNAL,cast);
require('./call_get.js')(Promise);
require('./generators.js')(Promise,apiRejection,INTERNAL,cast);
require('./map.js')(Promise,PromiseArray,apiRejection,cast,INTERNAL);
require('./nodeify.js')(Promise);
require('./promisify.js')(Promise,INTERNAL);
require('./props.js')(Promise,PromiseArray,cast);
require('./reduce.js')(Promise,PromiseArray,apiRejection,cast,INTERNAL);
require('./settle.js')(Promise,PromiseArray);
require('./some.js')(Promise,PromiseArray,apiRejection);
require('./progress.js')(Promise,PromiseArray);
require('./cancel.js')(Promise,INTERNAL);
require('./filter.js')(Promise,INTERNAL);
require('./any.js')(Promise,PromiseArray);
require('./each.js')(Promise,INTERNAL);
require('./using.js')(Promise,apiRejection,cast);

Promise.prototype = Promise.prototype;
return Promise;

};

},{"./any.js":18,"./assert.js":19,"./async.js":20,"./call_get.js":22,"./cancel.js":23,"./captured_trace.js":24,"./catch_filter.js":25,"./direct_resolve.js":26,"./each.js":27,"./errors.js":28,"./errors_api_rejection":29,"./filter.js":31,"./finally.js":32,"./generators.js":33,"./join.js":34,"./map.js":35,"./nodeify.js":36,"./progress.js":37,"./promise_array.js":39,"./promise_resolver.js":40,"./promisify.js":41,"./props.js":42,"./race.js":44,"./reduce.js":45,"./settle.js":47,"./some.js":48,"./synchronous_inspection.js":49,"./thenables.js":50,"./timers.js":51,"./using.js":52,"./util.js":53,"__browserify_process":16}],39:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL, cast) {
var ASSERT = require("./assert.js");
var canAttach = require("./errors.js").canAttach;
var util = require("./util.js");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -1: return void 0;
    case -2: return [];
    case -3: return {};
    }
    ASSERT(false,
    "false");
}

function PromiseArray(values) {
    ASSERT((arguments.length === 1),
    "arguments.length === 1");
    var promise = this._promise = new Promise(INTERNAL);
    var parent = void 0;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, 1 | 4);
    }
    promise._setTrace(parent);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(void 0, -2);
}
PromiseArray.prototype.length = function PromiseArray$length() {
    return this._length;
};

PromiseArray.prototype.promise = function PromiseArray$promise() {
    return this._promise;
};

PromiseArray.prototype._init =
function PromiseArray$_init(_, resolveValueIfEmpty) {
    var values = cast(this._values, void 0);
    if (values instanceof Promise) {
        this._values = values;
        values._setBoundTo(this._promise._boundTo);
        if (values.isFulfilled()) {
            values = values._settledValue;
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable");
                this.__hardReject__(err);
                return;
            }
        } else if (values.isPending()) {
            ASSERT(((typeof resolveValueIfEmpty) === "number"),
    "typeof resolveValueIfEmpty === \u0022number\u0022");
            ASSERT((resolveValueIfEmpty < 0),
    "resolveValueIfEmpty < 0");
            values._then(
                PromiseArray$_init,
                this._reject,
                void 0,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            values._unsetRejectionIsUnhandled();
            this._reject(values._settledValue);
            return;
        }
    } else if (!isArray(values)) {
        var err = new Promise.TypeError("expecting an array, a promise or a thenable");
        this.__hardReject__(err);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    var newLen = len;
    var newValues = this.shouldCopyValues() ? new Array(len) : this._values;
    var isDirectScanNeeded = false;
    for (var i = 0; i < len; ++i) {
        var maybePromise = cast(values[i], void 0);
        if (maybePromise instanceof Promise) {
            if (maybePromise.isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            } else {
                maybePromise._unsetRejectionIsUnhandled();
                isDirectScanNeeded = true;
            }
        } else {
            isDirectScanNeeded = true;
        }
        newValues[i] = maybePromise;
    }
    this._values = newValues;
    this._length = newLen;
    if (isDirectScanNeeded) {
        this._scanDirectValues(len);
    }
};

PromiseArray.prototype._settlePromiseAt =
function PromiseArray$_settlePromiseAt(index) {
    var value = this._values[index];
    if (!(value instanceof Promise)) {
        this._promiseFulfilled(value, index);
    } else if (value.isFulfilled()) {
        this._promiseFulfilled(value._settledValue, index);
    } else if (value.isRejected()) {
        this._promiseRejected(value._settledValue, index);
    }
};

PromiseArray.prototype._scanDirectValues =
function PromiseArray$_scanDirectValues(len) {
    ASSERT((len >= this.length()),
    "len >= this.length()");
    for (var i = 0; i < len; ++i) {
        if (this._isResolved()) {
            break;
        }
        this._settlePromiseAt(i);
    }
};

PromiseArray.prototype._isResolved = function PromiseArray$_isResolved() {
    return this._values === null;
};

PromiseArray.prototype._resolve = function PromiseArray$_resolve(value) {
    ASSERT((! this._isResolved()),
    "!this._isResolved()");
    ASSERT((! (value instanceof Promise)),
    "!(value instanceof Promise)");
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function PromiseArray$_reject(reason) {
    ASSERT((! this._isResolved()),
    "!this._isResolved()");
    this._values = null;
    var trace = canAttach(reason) ? reason : new Error(reason + "");
    this._promise._attachExtraTrace(trace);
    this._promise._reject(reason, trace);
};

PromiseArray.prototype._promiseProgressed =
function PromiseArray$_promiseProgressed(progressValue, index) {
    if (this._isResolved()) return;
    ASSERT(isArray(this._values),
    "isArray(this._values)");
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled =
function PromiseArray$_promiseFulfilled(value, index) {
    if (this._isResolved()) return;
    ASSERT(isArray(this._values),
    "isArray(this._values)");
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected =
function PromiseArray$_promiseRejected(reason, index) {
    ASSERT((index >= 0),
    "index >= 0");
    if (this._isResolved()) return;
    ASSERT(isArray(this._values),
    "isArray(this._values)");
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues =
function PromiseArray$_shouldCopyValues() {
    return true;
};

PromiseArray.prototype.getActualLength =
function PromiseArray$getActualLength(len) {
    return len;
};

return PromiseArray;
};

},{"./assert.js":19,"./errors.js":28,"./util.js":53}],40:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var util = require("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = require("./errors.js");
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var async = require("./async.js");
var haveGetters = util.haveGetters;
var es5 = require("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
    } else {
        ret = obj;
    }
    errors.markAsOriginatingFromRejection(ret);
    return ret;
}

function nodebackForPromise(promise) {
    function PromiseResolver$_callback(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (arguments.length > 2) {
            var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
            promise._fulfill(args);
        } else {
            promise._fulfill(value);
        }

        promise = null;
    }
    return PromiseResolver$_callback;
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function PromiseResolver(promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function PromiseResolver(promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function PromiseResolver$toString() {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function PromiseResolver$resolve(value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
    }

    var promise = this.promise;
    if (promise._tryFollow(value)) {
        return;
    }
    async.invoke(promise._fulfill, promise, value);
};

PromiseResolver.prototype.reject = function PromiseResolver$reject(reason) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
    }

    var promise = this.promise;
    errors.markAsOriginatingFromRejection(reason);
    var trace = errors.canAttach(reason) ? reason : new Error(reason + "");
    promise._attachExtraTrace(trace);
    async.invoke(promise._reject, promise, reason);
    if (trace !== reason) {
        async.invoke(this._setCarriedStackTrace, this, trace);
    }
};

PromiseResolver.prototype.progress =
function PromiseResolver$progress(value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.");
    }
    async.invoke(this.promise._progress, this.promise, value);
};

PromiseResolver.prototype.cancel = function PromiseResolver$cancel() {
    async.invoke(this.promise.cancel, this.promise, void 0);
};

PromiseResolver.prototype.timeout = function PromiseResolver$timeout() {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function PromiseResolver$isResolved() {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function PromiseResolver$toJSON() {
    return this.promise.toJSON();
};

PromiseResolver.prototype._setCarriedStackTrace =
function PromiseResolver$_setCarriedStackTrace(trace) {
    if (this.promise.isRejected()) {
        this.promise._setCarriedStackTrace(trace);
    }
};

module.exports = PromiseResolver;

},{"./async.js":20,"./errors.js":28,"./es5.js":30,"./util.js":53}],41:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = require("./util.js");
var nodebackForPromise = require("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var ASSERT = require("./assert.js");
var TypeError = require("./errors").TypeError;
var defaultSuffix = "Async";
var defaultFilter = function(name, func) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        !util.isClass(func);
};
var defaultPromisified = {__isPromisified__: true};


function escapeIdentRegex(str) {
    return str.replace(/([$])/, "\\$");
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API " +
                        "that has normal methods with '"+suffix+"'-suffix");
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

function switchCaseArgumentOrder(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 5);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        if (i === likelyArgumentCount) continue;
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 5; ++i) {
        ret.push(i);
    }
    return ret;
}

function argumentSequence(argumentCount) {
    return util.filledRange(argumentCount, "arguments[", "]");
}

function parameterDeclaration(parameterCount) {
    return util.filledRange(parameterCount, "_arg", "");
}

function parameterCount(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
}

function generatePropertyAccess(key) {
    if (util.isIdentifier(key)) {
        return "." + key;
    }
    else return "['" + key.replace(/(['\\])/g, "\\$1") + "']";
}

function makeNodePromisifiedEval(callback, receiver, originalName, fn, suffix) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var callbackName =
        (typeof originalName === "string" && util.isIdentifier(originalName)
            ? originalName + suffix
            : "promisified");

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (typeof callback === "string") {
            ret = "                                                          \n\
                this.method(args, fn);                                       \n\
                break;                                                       \n\
            ".replace(".method", generatePropertyAccess(callback));
        } else if (receiver === THIS) {
            ret =  "                                                         \n\
                callback.call(this, args, fn);                               \n\
                break;                                                       \n\
            ";
        } else if (receiver !== void 0) {
            ret =  "                                                         \n\
                callback.call(receiver, args, fn);                           \n\
                break;                                                       \n\
            ";
        } else {
            ret =  "                                                         \n\
                callback(args, fn);                                          \n\
                break;                                                       \n\
            ";
        }
        return ret.replace("args", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for(var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }
        var codeForCall;
        if (typeof callback === "string") {
            codeForCall = "                                                  \n\
                this.property.apply(this, args);                             \n\
            "
                .replace(".property", generatePropertyAccess(callback));
        } else if (receiver === THIS) {
            codeForCall = "                                                  \n\
                callback.apply(this, args);                                  \n\
            ";
        } else {
            codeForCall = "                                                  \n\
                callback.apply(receiver, args);                              \n\
            ";
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = fn;                                                    \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", codeForCall);
        return ret;
    }

    return new Function("Promise",
                        "callback",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "INTERNAL","                                         \n\
        var ret = function FunctionName(Parameters) {                        \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._setTrace(void 0);                                       \n\
            var fn = nodebackForPromise(promise);                            \n\
            try {                                                            \n\
                switch(len) {                                                \n\
                    [CodeForSwitchCase]                                      \n\
                }                                                            \n\
            } catch (e) {                                                    \n\
                var wrapped = maybeWrapAsError(e);                           \n\
                promise._attachExtraTrace(wrapped);                          \n\
                promise._reject(wrapped);                                    \n\
            }                                                                \n\
            return promise;                                                  \n\
        };                                                                   \n\
        ret.__isPromisified__ = true;                                        \n\
        return ret;                                                          \n\
        "
        .replace("FunctionName", callbackName)
        .replace("Parameters", parameterDeclaration(newParameterCount))
        .replace("[CodeForSwitchCase]", generateArgumentSwitchCase()))(
            Promise,
            callback,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            INTERNAL
        );
}

function makeNodePromisifiedClosure(callback, receiver) {
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        if (typeof callback === "string") {
            callback = _receiver[callback];
        }
        ASSERT(((typeof callback) === "function"),
    "typeof callback === \u0022function\u0022");
        var promise = new Promise(INTERNAL);
        promise._setTrace(void 0);
        var fn = nodebackForPromise(promise);
        try {
            callback.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            var wrapped = maybeWrapAsError(e);
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        }
        return promise;
    }
    promisified.__isPromisified__ = true;
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier) {
    ASSERT(((typeof suffix) === "string"),
    "typeof suffix === \u0022string\u0022");
    ASSERT(((typeof filter) === "function"),
    "typeof filter === \u0022function\u0022");
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        obj[promisifiedKey] = promisifier === makeNodePromisified
                ? makeNodePromisified(key, THIS, key, fn, suffix)
                : promisifier(fn);
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver) {
    return makeNodePromisified(callback, receiver, void 0, callback);
}

Promise.promisify = function Promise$Promisify(fn, receiver) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    return promisify(fn, arguments.length < 2 ? THIS : receiver);
};

Promise.promisifyAll = function Promise$PromisifyAll(target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function");
    }
    options = Object(options);
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier");
    }

    var keys = util.inheritedDataKeys(target, {includeHidden: true});
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier);
            promisifyAll(value, suffix, filter, promisifier);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier);
};
};


},{"./assert.js":19,"./errors":28,"./promise_resolver.js":40,"./util.js":53}],42:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray, cast) {
var ASSERT = require("./assert.js");
var util = require("./util.js");
var apiRejection = require("./errors_api_rejection")(Promise);
var isObject = util.isObject;
var es5 = require("./es5.js");

function PropertiesPromiseArray(obj) {
    var keys = es5.keys(obj);
    var len = keys.length;
    var values = new Array(len * 2);
    for (var i = 0; i < len; ++i) {
        var key = keys[i];
        values[i] = obj[key];
        values[i + len] = key;
    }
    this.constructor$(values);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init =
function PropertiesPromiseArray$_init() {
    this._init$(void 0, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled =
function PropertiesPromiseArray$_promiseFulfilled(value, index) {
    if (this._isResolved()) return;
    ASSERT((! (value instanceof Promise)),
    "!(value instanceof Promise)");
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed =
function PropertiesPromiseArray$_promiseProgressed(value, index) {
    if (this._isResolved()) return;

    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PropertiesPromiseArray.prototype.shouldCopyValues =
function PropertiesPromiseArray$_shouldCopyValues() {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength =
function PropertiesPromiseArray$getActualLength(len) {
    return len >> 1;
};

function Promise$_Props(promises) {
    var ret;
    var castValue = cast(promises, void 0);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(Promise.props, void 0, void 0, void 0, void 0);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 4);
    }
    return ret;
}

Promise.prototype.props = function Promise$props() {
    return Promise$_Props(this);
};

Promise.props = function Promise$Props(promises) {
    return Promise$_Props(promises);
};
};

},{"./assert.js":19,"./errors_api_rejection":29,"./es5.js":30,"./util.js":53}],43:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var ASSERT = require("./assert.js");
function arrayCopy(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
    this._makeCapacity();
}

Queue.prototype._willBeOverCapacity =
function Queue$_willBeOverCapacity(size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function Queue$_pushOne(arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function Queue$push(fn, receiver, arg) {
    ASSERT((arguments.length === 3),
    "arguments.length === 3");
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function Queue$shift() {
    ASSERT((this.length() > 0),
    "this.length() > 0");
    var front = this._front,
        ret = this[front];

    this[front] = void 0;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function Queue$length() {
    return this._length;
};

Queue.prototype._makeCapacity = function Queue$_makeCapacity() {
    var len = this._capacity;
    for (var i = 0; i < len; ++i) {
        this[i] = void 0;
    }
};

Queue.prototype._checkCapacity = function Queue$_checkCapacity(size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 3);
    }
};

Queue.prototype._resizeTo = function Queue$_resizeTo(capacity) {
    var oldFront = this._front;
    var oldCapacity = this._capacity;
    var oldQueue = new Array(oldCapacity);
    var length = this.length();

    arrayCopy(this, 0, oldQueue, 0, oldCapacity);
    this._capacity = capacity;
    this._makeCapacity();
    this._front = 0;
    if (oldFront + length <= oldCapacity) {
        arrayCopy(oldQueue, oldFront, this, 0, length);
    } else {        var lengthBeforeWrapping =
            length - ((oldFront + length) & (oldCapacity - 1));

        arrayCopy(oldQueue, oldFront, this, 0, lengthBeforeWrapping);
        arrayCopy(oldQueue, 0, this, lengthBeforeWrapping,
                    length - lengthBeforeWrapping);
    }
};

module.exports = Queue;

},{"./assert.js":19}],44:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL, cast) {
var apiRejection = require("./errors_api_rejection.js")(Promise);
var isArray = require("./util.js").isArray;

var raceLater = function Promise$_raceLater(promise) {
    return promise.then(function(array) {
        return Promise$_Race(array, promise);
    });
};

var hasOwn = {}.hasOwnProperty;
function Promise$_Race(promises, parent) {
    var maybePromise = cast(promises, void 0);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable");
    }

    var ret = new Promise(INTERNAL);
    if (parent !== void 0) {
        ret._propagateFrom(parent, 7);
    } else {
        ret._setTrace(void 0);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === void 0 && !(hasOwn.call(promises, i))) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, void 0, ret, null);
    }
    return ret;
}

Promise.race = function Promise$Race(promises) {
    return Promise$_Race(promises, void 0);
};

Promise.prototype.race = function Promise$race() {
    return Promise$_Race(this, void 0);
};

};

},{"./errors_api_rejection.js":29,"./util.js":53}],45:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, cast, INTERNAL) {
var util = require("./util.js");
var tryCatch4 = util.tryCatch4;
var tryCatch3 = util.tryCatch3;
var errorObj = util.errorObj;
var PENDING = {};
function ReductionPromiseArray(promises, fn, accum, _each) {
    this.constructor$(promises);
    var currentIndex = -2;
    this._preservedValues = _each === INTERNAL ? [] : null;
    var maybePromise = cast(accum, void 0);
    var rejected = false;
    var isPromise = maybePromise instanceof Promise;
    if (isPromise) {
        if (maybePromise.isPending()) {
            currentIndex = -1;
            maybePromise._proxyPromiseArray(this, -1);
        } else if (maybePromise.isFulfilled()) {
            accum = maybePromise.value();
            currentIndex = 0;
        } else {
            maybePromise._unsetRejectionIsUnhandled();
            this._reject(maybePromise.reason());
            rejected = true;
        }
    }
    if (!isPromise && accum !== void 0) currentIndex = 0;
    this._callback = fn;
    this._currentIndex = currentIndex;
    this._accum = accum;
    if (!rejected) this._init$(void 0, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._init =
function ReductionPromiseArray$_init() {};

ReductionPromiseArray.prototype._resolveEmptyArray =
function ReductionPromiseArray$_resolveEmptyArray() {
    if (this._currentIndex !== -1) {
        this._resolve(this._preservedValues !== null
                        ? [] : this._accum);
    }
};

ReductionPromiseArray.prototype._promiseFulfilled =
function ReductionPromiseArray$_promiseFulfilled(value, index) {
    var accum;
    var values = this._values;
    if (values === null) return;
    var length = this.length();
    var currentIndex = this._currentIndex;
    if (currentIndex > index) return;
    var preservedValues = this._preservedValues;
    var isEach = preservedValues !== null;
    if (index === 0 && currentIndex === -2) {
        accum = value;
        currentIndex = 1;
        if (length < 2) return this._resolve(void 0);
        value = values[1];
    } else if (index > currentIndex) {
        return;
    } else if (index === -1 || values[index] === PENDING) {
        accum = value;
        currentIndex++;
        if (currentIndex >= length)
            return this._resolve(isEach ? preservedValues : accum);
        value = values[currentIndex];
    } else {
        accum = this._accum;
    }

    var callback = this._callback;
    var receiver = this._promise._boundTo;
    var ret;

    for (var i = currentIndex; i < length; ++i) {
        if (i > currentIndex) value = values[i];

        if (value instanceof Promise) {
            if (value.isFulfilled()) {
                value = value._settledValue;
            } else if (value.isPending()) {
                this._accum = accum;
                this._currentIndex = i;
                return;
            } else {
                value._unsetRejectionIsUnhandled();
                return this._reject(value.reason());
            }
        }

        if (isEach) {
            preservedValues.push(value);
            ret = tryCatch3(callback, receiver, value, i, length);
        }
        else {
            ret = tryCatch4(callback, receiver, accum, value, i, length);
        }

        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = cast(ret, void 0);
        if (maybePromise instanceof Promise) {
            if (maybePromise.isPending()) {
                values[i] = PENDING;
                this._accum = accum;
                this._currentIndex = i;
                return maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise.isFulfilled()) {
                ret = maybePromise.value();
            } else {
                maybePromise._unsetRejectionIsUnhandled();
                return this._reject(maybePromise.reason());
            }
        }
        accum = ret;
    }
    this._resolve(isEach ? preservedValues : accum);
};

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") return apiRejection("fn must be a function");
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

Promise.prototype.reduce = function Promise$reduce(fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function Promise$Reduce(promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};
};

},{"./util.js":53}],46:[function(require,module,exports){
var process=require("__browserify_process");/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var ASSERT = require("./assert.js");
var schedule;
var _MutationObserver;
if (typeof process === "object" && typeof process.version === "string") {
    schedule = function Promise$_Scheduler(fn) {
        process.nextTick(fn);
    };
}
else if ((typeof MutationObserver !== "undefined" &&
         (_MutationObserver = MutationObserver)) ||
         (typeof WebKitMutationObserver !== "undefined" &&
         (_MutationObserver = WebKitMutationObserver))) {
    schedule = (function() {
        var div = document.createElement("div");
        var queuedFn = void 0;
        var observer = new _MutationObserver(
            function Promise$_Scheduler() {
                ASSERT((queuedFn !== (void 0)),
    "queuedFn !== void 0");
                var fn = queuedFn;
                queuedFn = void 0;
                fn();
            }
       );
        observer.observe(div, {
            attributes: true
        });
        return function Promise$_Scheduler(fn) {
            ASSERT((queuedFn === (void 0)),
    "queuedFn === void 0");
            queuedFn = fn;
            div.setAttribute("class", "foo");
        };

    })();
}
else if (typeof setTimeout !== "undefined") {
    schedule = function Promise$_Scheduler(fn) {
        setTimeout(fn, 0);
    };
}
else throw new Error("no async scheduler available");
module.exports = schedule;

},{"./assert.js":19,"__browserify_process":16}],47:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports =
    function(Promise, PromiseArray) {
var ASSERT = require("./assert.js");
var PromiseInspection = Promise.PromiseInspection;
var util = require("./util.js");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved =
function SettledPromiseArray$_promiseResolved(index, inspection) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled =
function SettledPromiseArray$_promiseFulfilled(value, index) {
    if (this._isResolved()) return;
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected =
function SettledPromiseArray$_promiseRejected(reason, index) {
    if (this._isResolved()) return;
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

Promise.settle = function Promise$Settle(promises) {
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function Promise$settle() {
    return new SettledPromiseArray(this).promise();
};
};

},{"./assert.js":19,"./util.js":53}],48:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var ASSERT = require("./assert.js");
var util = require("./util.js");
var RangeError = require("./errors.js").RangeError;
var AggregateError = require("./errors.js").AggregateError;
var isArray = util.isArray;


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function SomePromiseArray$_init() {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(void 0, -2);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        var message = "(Promise.some) input array contains less than " +
                        this._howMany  + " promises";
        this._reject(new RangeError(message));
    }
};

SomePromiseArray.prototype.init = function SomePromiseArray$init() {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function SomePromiseArray$setUnwrap() {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function SomePromiseArray$howMany() {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany =
function SomePromiseArray$setHowMany(count) {
    if (this._isResolved()) return;
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled =
function SomePromiseArray$_promiseFulfilled(value) {
    if (this._isResolved()) return;
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected =
function SomePromiseArray$_promiseRejected(reason) {
    if (this._isResolved()) return;
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            e.push(this._values[i]);
        }
        this._reject(e);
    }
};

SomePromiseArray.prototype._fulfilled = function SomePromiseArray$_fulfilled() {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function SomePromiseArray$_rejected() {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected =
function SomePromiseArray$_addRejected(reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled =
function SomePromiseArray$_addFulfilled(value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill =
function SomePromiseArray$_canPossiblyFulfill() {
    return this.length() - this._rejected();
};

function Promise$_Some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    if (promise.isRejected()) {
        return promise;
    }
    ASSERT((ret instanceof SomePromiseArray),
    "ret instanceof SomePromiseArray");
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function Promise$Some(promises, howMany) {
    return Promise$_Some(promises, howMany);
};

Promise.prototype.some = function Promise$some(howMany) {
    return Promise$_Some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./assert.js":19,"./errors.js":28,"./util.js":53}],49:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== void 0) {
        this._bitField = promise._bitField;
        this._settledValue = promise.isResolved()
            ? promise._settledValue
            : void 0;
    }
    else {
        this._bitField = 0;
        this._settledValue = void 0;
    }
}

PromiseInspection.prototype.isFulfilled =
Promise.prototype.isFulfilled = function Promise$isFulfilled() {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype.isRejected = function Promise$isRejected() {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype.isPending = function Promise$isPending() {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.value =
Promise.prototype.value = function Promise$value() {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
PromiseInspection.prototype.reason =
Promise.prototype.reason = function Promise$reason() {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isResolved =
Promise.prototype.isResolved = function Promise$isResolved() {
    return (this._bitField & 402653184) > 0;
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],50:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function(Promise, INTERNAL) {
var ASSERT = require("./assert.js");
var util = require("./util.js");
var canAttach = require("./errors.js").canAttach;
var errorObj = util.errorObj;
var isObject = util.isObject;

function getThen(obj) {
    try {
        return obj.then;
    }
    catch(e) {
        errorObj.e = e;
        return errorObj;
    }
}

function Promise$_Cast(obj, originalPromise) {
    ASSERT((arguments.length === 2),
    "arguments.length === 2");
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            ret._setTrace(void 0);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            ret._setFollowing();
            return ret;
        }
        var then = getThen(obj);
        if (then === errorObj) {
            if (originalPromise !== void 0 && canAttach(then.e)) {
                originalPromise._attachExtraTrace(then.e);
            }
            return Promise.reject(then.e);
        } else if (typeof then === "function") {
            return Promise$_doThenable(obj, then, originalPromise);
        }
    }
    return obj;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function Promise$_doThenable(x, then, originalPromise) {
    ASSERT(((typeof then) === "function"),
    "typeof then === \u0022function\u0022");
    ASSERT((arguments.length === 3),
    "arguments.length === 3");
    var resolver = Promise.defer();
    var called = false;
    try {
        then.call(
            x,
            Promise$_resolveFromThenable,
            Promise$_rejectFromThenable,
            Promise$_progressFromThenable
        );
    } catch(e) {
        if (!called) {
            called = true;
            var trace = canAttach(e) ? e : new Error(e + "");
            if (originalPromise !== void 0) {
                originalPromise._attachExtraTrace(trace);
            }
            resolver.promise._reject(e, trace);
        }
    }
    return resolver.promise;

    function Promise$_resolveFromThenable(y) {
        if (called) return;
        called = true;

        if (x === y) {
            var e = Promise._makeSelfResolutionError();
            if (originalPromise !== void 0) {
                originalPromise._attachExtraTrace(e);
            }
            resolver.promise._reject(e, void 0);
            return;
        }
        resolver.resolve(y);
    }

    function Promise$_rejectFromThenable(r) {
        if (called) return;
        called = true;
        var trace = canAttach(r) ? r : new Error(r + "");
        if (originalPromise !== void 0) {
            originalPromise._attachExtraTrace(trace);
        }
        resolver.promise._reject(r, trace);
    }

    function Promise$_progressFromThenable(v) {
        if (called) return;
        var promise = resolver.promise;
        if (typeof promise._progress === "function") {
            promise._progress(v);
        }
    }
}

return Promise$_Cast;
};

},{"./assert.js":19,"./errors.js":28,"./util.js":53}],51:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var ASSERT = require("./assert.js");
var _setTimeout = function(fn, ms) {
    var len = arguments.length;
    ASSERT(((4 <= len) && (len <= 5)),
    "4 <= len && len <= 5");
    var arg0 = arguments[2];
    var arg1 = arguments[3];
    var arg2 = len >= 5 ? arguments[4] : void 0;
    setTimeout(function() {
        fn(arg0, arg1, arg2);
    }, ms);
};

module.exports = function(Promise, INTERNAL, cast) {
var util = require("./util.js");
var errors = require("./errors.js");
var apiRejection = require("./errors_api_rejection")(Promise);
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function Promise$_afterTimeout(promise, message, ms) {
    if (!promise.isPending()) return;
    if (typeof message !== "string") {
        message = "operation timed out after" + " " + ms + " ms"
    }
    var err = new TimeoutError(message);
    errors.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._cancel(err);
};

var afterDelay = function Promise$_afterDelay(value, promise) {
    promise._fulfill(value);
};

var delay = Promise.delay = function Promise$Delay(value, ms) {
    if (ms === void 0) {
        ms = value;
        value = void 0;
    }
    ms = +ms;
    var maybePromise = cast(value, void 0);
    var promise = new Promise(INTERNAL);

    if (maybePromise instanceof Promise) {
        promise._propagateFrom(maybePromise, 7);
        promise._follow(maybePromise);
        return promise.then(function(value) {
            return Promise.delay(value, ms);
        });
    } else {
        promise._setTrace(void 0);
        _setTimeout(afterDelay, ms, value, promise);
    }
    return promise;
};

Promise.prototype.delay = function Promise$delay(ms) {
    return delay(this, ms);
};

Promise.prototype.timeout = function Promise$timeout(ms, message) {
    ms = +ms;

    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 7);
    ret._follow(this);
    _setTimeout(afterTimeout, ms, ret, message, ms);
    return ret.cancellable();
};

};

},{"./assert.js":19,"./errors.js":28,"./errors_api_rejection":29,"./util.js":53}],52:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
module.exports = function (Promise, apiRejection, cast) {
    var TypeError = require("./errors.js").TypeError;
    var inherits = require("./util.js").inherits;
    var PromiseInspection = Promise.PromiseInspection;

    function inspectionMapper(inspections) {
        var len = inspections.length;
        for (var i = 0; i < len; ++i) {
            var inspection = inspections[i];
            if (inspection.isRejected()) {
                return Promise.reject(inspection.error());
            }
            inspections[i] = inspection.value();
        }
        return inspections;
    }

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = Promise.defer();
        function iterator() {
            if (i >= len) return ret.resolve();
            var maybePromise = cast(resources[i++], void 0);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = cast(maybePromise._getDisposer()
                                        .tryDispose(inspection), void 0);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret.promise;
    }

    function disposerSuccess(value) {
        var inspection = new PromiseInspection();
        inspection._settledValue = value;
        inspection._bitField = 268435456;
        return dispose(this, inspection).thenReturn(value);
    }

    function disposerFail(reason) {
        var inspection = new PromiseInspection();
        inspection._settledValue = reason;
        inspection._bitField = 134217728;
        return dispose(this, inspection).thenThrow(reason);
    }

    function Disposer(data, promise) {
        this._data = data;
        this._promise = promise;
    }

    Disposer.prototype.data = function Disposer$data() {
        return this._data;
    };

    Disposer.prototype.promise = function Disposer$promise() {
        return this._promise;
    };

    Disposer.prototype.resource = function Disposer$resource() {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        this._promise._unsetDisposable();
        this._data = this._promise = null;
        return ret;
    };

    function FunctionDisposer(fn, promise) {
        this.constructor$(fn, promise);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    Promise.using = function Promise$using() {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") return apiRejection("fn must be a function");
        len--;
        var resources = new Array(len);
        for (var i = 0; i < len; ++i) {
            var resource = arguments[i];
            if (resource instanceof Disposer) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            }
            resources[i] = resource;
        }

        return Promise.settle(resources)
            .then(inspectionMapper)
            .spread(fn)
            ._then(disposerSuccess, disposerFail, void 0, resources, void 0);
    };

    Promise.prototype._setDisposable =
    function Promise$_setDisposable(disposer) {
        this._bitField = this._bitField | 262144;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function Promise$_isDisposable() {
        return (this._bitField & 262144) > 0;
    };

    Promise.prototype._getDisposer = function Promise$_getDisposer() {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function Promise$_unsetDisposable() {
        this._bitField = this._bitField & (~262144);
        this._disposer = void 0;
    };

    Promise.prototype.disposer = function Promise$disposer(fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this);
        }
        throw new TypeError();
    };

};

},{"./errors.js":28,"./util.js":53}],53:[function(require,module,exports){
/**
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
"use strict";
var ASSERT = require("./assert.js");
var es5 = require("./es5.js");
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();
var canEvaluate = typeof navigator == "undefined";
var errorObj = {e: {}};
function tryCatch1(fn, receiver, arg) {
    try { return fn.call(receiver, arg); }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatch2(fn, receiver, arg, arg2) {
    try { return fn.call(receiver, arg, arg2); }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatch3(fn, receiver, arg, arg2, arg3) {
    try { return fn.call(receiver, arg, arg2, arg3); }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatch4(fn, receiver, arg, arg2, arg3, arg4) {
    try { return fn.call(receiver, arg, arg2, arg3, arg4); }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatchApply(fn, args, receiver) {
    try { return fn.apply(receiver, args); }
    catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};

function asString(val) {
    return typeof val === "string" ? val : ("" + val);
}

function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(asString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : void 0;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}


var wrapsPrimitiveReceiver = (function() {
    return this !== "string";
}).call("string");

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    if (es5.isES5) {
        return function(obj, opts) {
            var ret = [];
            var visitedKeys = Object.create(null);
            var getKeys = Object(opts).includeHidden
                ? Object.getOwnPropertyNames
                : Object.keys;
            while (obj != null) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        return function(obj) {
            var ret = [];
            /*jshint forin:false */
            for (var key in obj) {
                ret.push(key);
            }
            return ret;
        };
    }

})();

function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.keys(fn.prototype);
            return keys.length > 0 &&
                   !(keys.length === 1 && keys[0] === "constructor");
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027*/
    function f() {}
    f.prototype = obj;
    ASSERT("%HasFastProperties", true, obj);
    return f;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch1: tryCatch1,
    tryCatch2: tryCatch2,
    tryCatch3: tryCatch3,
    tryCatch4: tryCatch4,
    tryCatchApply: tryCatchApply,
    inherits: inherits,
    withAppended: withAppended,
    asString: asString,
    maybeWrapAsError: maybeWrapAsError,
    wrapsPrimitiveReceiver: wrapsPrimitiveReceiver,
    toFastProperties: toFastProperties,
    filledRange: filledRange
};

module.exports = ret;

},{"./assert.js":19,"./es5.js":30}],54:[function(require,module,exports){
var process=require("__browserify_process");// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this does have the nice side-effect of reducing the size
// of the code by reducing x.call() to merely x(), eliminating many
// hard-to-minify characters.
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
// engine that has a deployed base of browsers that support generators.
// However, SM's generators use the Python-inspired semantics of
// outdated ES6 drafts.  We would like to support ES6, but we'd also
// like to make it possible to use generators in deployed browsers, so
// we also support Python-style generators.  At some point we can remove
// this block.
var hasES6Generators;
try {
    /* jshint evil: true, nonew: false */
    new Function("(function* (){ yield 1; })");
    hasES6Generators = true;
} catch (e) {
    hasES6Generators = false;
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = deprecate(function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    }, "valueOf", "inspect");

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = deprecate(function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        });
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var unhandledReasonsDisplayed = false;
var trackUnhandledRejections = true;
function displayUnhandledReasons() {
    if (
        !unhandledReasonsDisplayed &&
        typeof window !== "undefined" &&
        !window.Touch &&
        window.console
    ) {
        console.warn("[Q] Unhandled rejection reasons (should be empty):",
                     unhandledReasons);
    }

    unhandledReasonsDisplayed = true;
}

function logUnhandledReasons() {
    for (var i = 0; i < unhandledReasons.length; i++) {
        var reason = unhandledReasons[i];
        console.warn("Unhandled rejection reason:", reason);
    }
}

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;
    unhandledReasonsDisplayed = false;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;

        // Show unhandled rejection reasons if Node exits without handling an
        // outstanding rejection.  (Note that Browserify presently produces a
        // `process` global without the `EventEmitter` `on` method.)
        if (typeof process !== "undefined" && process.on) {
            process.on("exit", logUnhandledReasons);
        }
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
    displayUnhandledReasons();
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    if (typeof process !== "undefined" && process.on) {
        process.removeListener("exit", logUnhandledReasons);
    }
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;
            if (hasES6Generators) {
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
};

Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || "Timed out after " + ms + " ms"));
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

},{"__browserify_process":16}],55:[function(require,module,exports){
/*jslint eqeqeq: false, onevar: false, forin: true, nomen: false, regexp: false, plusplus: false*/
/*global module, require, __dirname, document*/
/**
 * Sinon core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

var sinon = (function (buster) {
    var div = typeof document != "undefined" && document.createElement("div");
    var hasOwn = Object.prototype.hasOwnProperty;

    function isDOMNode(obj) {
        var success = false;

        try {
            obj.appendChild(div);
            success = div.parentNode == obj;
        } catch (e) {
            return false;
        } finally {
            try {
                obj.removeChild(div);
            } catch (e) {
                // Remove failed, not much we can do about that
            }
        }

        return success;
    }

    function isElement(obj) {
        return div && obj && obj.nodeType === 1 && isDOMNode(obj);
    }

    function isFunction(obj) {
        return typeof obj === "function" || !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function mirrorProperties(target, source) {
        for (var prop in source) {
            if (!hasOwn.call(target, prop)) {
                target[prop] = source[prop];
            }
        }
    }

    function isRestorable (obj) {
        return typeof obj === "function" && typeof obj.restore === "function" && obj.restore.sinon;
    }

    var sinon = {
        wrapMethod: function wrapMethod(object, property, method) {
            if (!object) {
                throw new TypeError("Should wrap property of object");
            }

            if (typeof method != "function") {
                throw new TypeError("Method wrapper should be function");
            }

            var wrappedMethod = object[property];

            if (!isFunction(wrappedMethod)) {
                throw new TypeError("Attempted to wrap " + (typeof wrappedMethod) + " property " +
                                    property + " as function");
            }

            if (wrappedMethod.restore && wrappedMethod.restore.sinon) {
                throw new TypeError("Attempted to wrap " + property + " which is already wrapped");
            }

            if (wrappedMethod.calledBefore) {
                var verb = !!wrappedMethod.returns ? "stubbed" : "spied on";
                throw new TypeError("Attempted to wrap " + property + " which is already " + verb);
            }

            // IE 8 does not support hasOwnProperty on the window object.
            var owned = hasOwn.call(object, property);
            object[property] = method;
            method.displayName = property;

            method.restore = function () {
                // For prototype properties try to reset by delete first.
                // If this fails (ex: localStorage on mobile safari) then force a reset
                // via direct assignment.
                if (!owned) {
                    delete object[property];
                }
                if (object[property] === method) {
                    object[property] = wrappedMethod;
                }
            };

            method.restore.sinon = true;
            mirrorProperties(method, wrappedMethod);

            return method;
        },

        extend: function extend(target) {
            for (var i = 1, l = arguments.length; i < l; i += 1) {
                for (var prop in arguments[i]) {
                    if (arguments[i].hasOwnProperty(prop)) {
                        target[prop] = arguments[i][prop];
                    }

                    // DONT ENUM bug, only care about toString
                    if (arguments[i].hasOwnProperty("toString") &&
                        arguments[i].toString != target.toString) {
                        target.toString = arguments[i].toString;
                    }
                }
            }

            return target;
        },

        create: function create(proto) {
            var F = function () {};
            F.prototype = proto;
            return new F();
        },

        deepEqual: function deepEqual(a, b) {
            if (sinon.match && sinon.match.isMatcher(a)) {
                return a.test(b);
            }
            if (typeof a != "object" || typeof b != "object") {
                return a === b;
            }

            if (isElement(a) || isElement(b)) {
                return a === b;
            }

            if (a === b) {
                return true;
            }

            if ((a === null && b !== null) || (a !== null && b === null)) {
                return false;
            }

            var aString = Object.prototype.toString.call(a);
            if (aString != Object.prototype.toString.call(b)) {
                return false;
            }

            if (aString == "[object Array]") {
                if (a.length !== b.length) {
                    return false;
                }

                for (var i = 0, l = a.length; i < l; i += 1) {
                    if (!deepEqual(a[i], b[i])) {
                        return false;
                    }
                }

                return true;
            }

            if (aString == "[object Date]") {
                return a.valueOf() === b.valueOf();
            }

            var prop, aLength = 0, bLength = 0;

            for (prop in a) {
                aLength += 1;

                if (!deepEqual(a[prop], b[prop])) {
                    return false;
                }
            }

            for (prop in b) {
                bLength += 1;
            }

            return aLength == bLength;
        },

        functionName: function functionName(func) {
            var name = func.displayName || func.name;

            // Use function decomposition as a last resort to get function
            // name. Does not rely on function decomposition to work - if it
            // doesn't debugging will be slightly less informative
            // (i.e. toString will say 'spy' rather than 'myFunc').
            if (!name) {
                var matches = func.toString().match(/function ([^\s\(]+)/);
                name = matches && matches[1];
            }

            return name;
        },

        functionToString: function toString() {
            if (this.getCall && this.callCount) {
                var thisValue, prop, i = this.callCount;

                while (i--) {
                    thisValue = this.getCall(i).thisValue;

                    for (prop in thisValue) {
                        if (thisValue[prop] === this) {
                            return prop;
                        }
                    }
                }
            }

            return this.displayName || "sinon fake";
        },

        getConfig: function (custom) {
            var config = {};
            custom = custom || {};
            var defaults = sinon.defaultConfig;

            for (var prop in defaults) {
                if (defaults.hasOwnProperty(prop)) {
                    config[prop] = custom.hasOwnProperty(prop) ? custom[prop] : defaults[prop];
                }
            }

            return config;
        },

        format: function (val) {
            return "" + val;
        },

        defaultConfig: {
            injectIntoThis: true,
            injectInto: null,
            properties: ["spy", "stub", "mock", "clock", "server", "requests"],
            useFakeTimers: true,
            useFakeServer: true
        },

        timesInWords: function timesInWords(count) {
            return count == 1 && "once" ||
                count == 2 && "twice" ||
                count == 3 && "thrice" ||
                (count || 0) + " times";
        },

        calledInOrder: function (spies) {
            for (var i = 1, l = spies.length; i < l; i++) {
                if (!spies[i - 1].calledBefore(spies[i]) || !spies[i].called) {
                    return false;
                }
            }

            return true;
        },

        orderByFirstCall: function (spies) {
            return spies.sort(function (a, b) {
                // uuid, won't ever be equal
                var aCall = a.getCall(0);
                var bCall = b.getCall(0);
                var aId = aCall && aCall.callId || -1;
                var bId = bCall && bCall.callId || -1;

                return aId < bId ? -1 : 1;
            });
        },

        log: function () {},

        logError: function (label, err) {
            var msg = label + " threw exception: "
            sinon.log(msg + "[" + err.name + "] " + err.message);
            if (err.stack) { sinon.log(err.stack); }

            setTimeout(function () {
                err.message = msg + err.message;
                throw err;
            }, 0);
        },

        typeOf: function (value) {
            if (value === null) {
                return "null";
            }
            else if (value === undefined) {
                return "undefined";
            }
            var string = Object.prototype.toString.call(value);
            return string.substring(8, string.length - 1).toLowerCase();
        },

        createStubInstance: function (constructor) {
            if (typeof constructor !== "function") {
                throw new TypeError("The constructor should be a function.");
            }
            return sinon.stub(sinon.create(constructor.prototype));
        },

        restore: function (object) {
            if (object !== null && typeof object === "object") {
                for (var prop in object) {
                    if (isRestorable(object[prop])) {
                        object[prop].restore();
                    }
                }
            }
            else if (isRestorable(object)) {
                object.restore();
            }
        }
    };

    var isNode = typeof module == "object" && typeof require == "function";

    if (isNode) {
        try {
            buster = { format: require("buster-format") };
        } catch (e) {}
        module.exports = sinon;
        module.exports.spy = require("./sinon/spy");
        module.exports.stub = require("./sinon/stub");
        module.exports.mock = require("./sinon/mock");
        module.exports.collection = require("./sinon/collection");
        module.exports.assert = require("./sinon/assert");
        module.exports.sandbox = require("./sinon/sandbox");
        module.exports.test = require("./sinon/test");
        module.exports.testCase = require("./sinon/test_case");
        module.exports.assert = require("./sinon/assert");
        module.exports.match = require("./sinon/match");
    }

    if (buster) {
        var formatter = sinon.create(buster.format);
        formatter.quoteStrings = false;
        sinon.format = function () {
            return formatter.ascii.apply(formatter, arguments);
        };
    } else if (isNode) {
        try {
            var util = require("util");
            sinon.format = function (value) {
                return typeof value == "object" && value.toString === Object.prototype.toString ? util.inspect(value) : value;
            };
        } catch (e) {
            /* Node, but no util module - would be very old, but better safe than
             sorry */
        }
    }

    return sinon;
}(typeof buster == "object" && buster));

},{"./sinon/assert":56,"./sinon/collection":57,"./sinon/match":58,"./sinon/mock":59,"./sinon/sandbox":60,"./sinon/spy":61,"./sinon/stub":62,"./sinon/test":63,"./sinon/test_case":64,"buster-format":66,"util":6}],56:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Assertions matching the test spy retrieval interface.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon, global) {
    var commonJSModule = typeof module == "object" && typeof require == "function";
    var slice = Array.prototype.slice;
    var assert;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function verifyIsStub() {
        var method;

        for (var i = 0, l = arguments.length; i < l; ++i) {
            method = arguments[i];

            if (!method) {
                assert.fail("fake is not a spy");
            }

            if (typeof method != "function") {
                assert.fail(method + " is not a function");
            }

            if (typeof method.getCall != "function") {
                assert.fail(method + " is not stubbed");
            }
        }
    }

    function failAssertion(object, msg) {
        object = object || global;
        var failMethod = object.fail || assert.fail;
        failMethod.call(object, msg);
    }

    function mirrorPropAsAssertion(name, method, message) {
        if (arguments.length == 2) {
            message = method;
            method = name;
        }

        assert[name] = function (fake) {
            verifyIsStub(fake);

            var args = slice.call(arguments, 1);
            var failed = false;

            if (typeof method == "function") {
                failed = !method(fake);
            } else {
                failed = typeof fake[method] == "function" ?
                    !fake[method].apply(fake, args) : !fake[method];
            }

            if (failed) {
                failAssertion(this, fake.printf.apply(fake, [message].concat(args)));
            } else {
                assert.pass(name);
            }
        };
    }

    function exposedName(prefix, prop) {
        return !prefix || /^fail/.test(prop) ? prop :
            prefix + prop.slice(0, 1).toUpperCase() + prop.slice(1);
    };

    assert = {
        failException: "AssertError",

        fail: function fail(message) {
            var error = new Error(message);
            error.name = this.failException || assert.failException;

            throw error;
        },

        pass: function pass(assertion) {},

        callOrder: function assertCallOrder() {
            verifyIsStub.apply(null, arguments);
            var expected = "", actual = "";

            if (!sinon.calledInOrder(arguments)) {
                try {
                    expected = [].join.call(arguments, ", ");
                    var calls = slice.call(arguments);
                    var i = calls.length;
                    while (i) {
                        if (!calls[--i].called) {
                            calls.splice(i, 1);
                        }
                    }
                    actual = sinon.orderByFirstCall(calls).join(", ");
                } catch (e) {
                    // If this fails, we'll just fall back to the blank string
                }

                failAssertion(this, "expected " + expected + " to be " +
                              "called in order but were called as " + actual);
            } else {
                assert.pass("callOrder");
            }
        },

        callCount: function assertCallCount(method, count) {
            verifyIsStub(method);

            if (method.callCount != count) {
                var msg = "expected %n to be called " + sinon.timesInWords(count) +
                    " but was called %c%C";
                failAssertion(this, method.printf(msg));
            } else {
                assert.pass("callCount");
            }
        },

        expose: function expose(target, options) {
            if (!target) {
                throw new TypeError("target is null or undefined");
            }

            var o = options || {};
            var prefix = typeof o.prefix == "undefined" && "assert" || o.prefix;
            var includeFail = typeof o.includeFail == "undefined" || !!o.includeFail;

            for (var method in this) {
                if (method != "export" && (includeFail || !/^(fail)/.test(method))) {
                    target[exposedName(prefix, method)] = this[method];
                }
            }

            return target;
        }
    };

    mirrorPropAsAssertion("called", "expected %n to have been called at least once but was never called");
    mirrorPropAsAssertion("notCalled", function (spy) { return !spy.called; },
                          "expected %n to not have been called but was called %c%C");
    mirrorPropAsAssertion("calledOnce", "expected %n to be called once but was called %c%C");
    mirrorPropAsAssertion("calledTwice", "expected %n to be called twice but was called %c%C");
    mirrorPropAsAssertion("calledThrice", "expected %n to be called thrice but was called %c%C");
    mirrorPropAsAssertion("calledOn", "expected %n to be called with %1 as this but was called with %t");
    mirrorPropAsAssertion("alwaysCalledOn", "expected %n to always be called with %1 as this but was called with %t");
    mirrorPropAsAssertion("calledWithNew", "expected %n to be called with new");
    mirrorPropAsAssertion("alwaysCalledWithNew", "expected %n to always be called with new");
    mirrorPropAsAssertion("calledWith", "expected %n to be called with arguments %*%C");
    mirrorPropAsAssertion("calledWithMatch", "expected %n to be called with match %*%C");
    mirrorPropAsAssertion("alwaysCalledWith", "expected %n to always be called with arguments %*%C");
    mirrorPropAsAssertion("alwaysCalledWithMatch", "expected %n to always be called with match %*%C");
    mirrorPropAsAssertion("calledWithExactly", "expected %n to be called with exact arguments %*%C");
    mirrorPropAsAssertion("alwaysCalledWithExactly", "expected %n to always be called with exact arguments %*%C");
    mirrorPropAsAssertion("neverCalledWith", "expected %n to never be called with arguments %*%C");
    mirrorPropAsAssertion("neverCalledWithMatch", "expected %n to never be called with match %*%C");
    mirrorPropAsAssertion("threw", "%n did not throw exception%C");
    mirrorPropAsAssertion("alwaysThrew", "%n did not always throw exception%C");

    if (commonJSModule) {
        module.exports = assert;
    } else {
        sinon.assert = assert;
    }
}(typeof sinon == "object" && sinon || null, typeof window != "undefined" ? window : (typeof self != "undefined") ? self : global));

},{"../sinon":55}],57:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true*/
/*global module, require, sinon*/
/**
 * Collections of stubs, spies and mocks.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";
    var push = [].push;
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function getFakes(fakeCollection) {
        if (!fakeCollection.fakes) {
            fakeCollection.fakes = [];
        }

        return fakeCollection.fakes;
    }

    function each(fakeCollection, method) {
        var fakes = getFakes(fakeCollection);

        for (var i = 0, l = fakes.length; i < l; i += 1) {
            if (typeof fakes[i][method] == "function") {
                fakes[i][method]();
            }
        }
    }

    function compact(fakeCollection) {
        var fakes = getFakes(fakeCollection);
        var i = 0;
        while (i < fakes.length) {
          fakes.splice(i, 1);
        }
    }

    var collection = {
        verify: function resolve() {
            each(this, "verify");
        },

        restore: function restore() {
            each(this, "restore");
            compact(this);
        },

        verifyAndRestore: function verifyAndRestore() {
            var exception;

            try {
                this.verify();
            } catch (e) {
                exception = e;
            }

            this.restore();

            if (exception) {
                throw exception;
            }
        },

        add: function add(fake) {
            push.call(getFakes(this), fake);
            return fake;
        },

        spy: function spy() {
            return this.add(sinon.spy.apply(sinon, arguments));
        },

        stub: function stub(object, property, value) {
            if (property) {
                var original = object[property];

                if (typeof original != "function") {
                    if (!hasOwnProperty.call(object, property)) {
                        throw new TypeError("Cannot stub non-existent own property " + property);
                    }

                    object[property] = value;

                    return this.add({
                        restore: function () {
                            object[property] = original;
                        }
                    });
                }
            }
            if (!property && !!object && typeof object == "object") {
                var stubbedObj = sinon.stub.apply(sinon, arguments);

                for (var prop in stubbedObj) {
                    if (typeof stubbedObj[prop] === "function") {
                        this.add(stubbedObj[prop]);
                    }
                }

                return stubbedObj;
            }

            return this.add(sinon.stub.apply(sinon, arguments));
        },

        mock: function mock() {
            return this.add(sinon.mock.apply(sinon, arguments));
        },

        inject: function inject(obj) {
            var col = this;

            obj.spy = function () {
                return col.spy.apply(col, arguments);
            };

            obj.stub = function () {
                return col.stub.apply(col, arguments);
            };

            obj.mock = function () {
                return col.mock.apply(col, arguments);
            };

            return obj;
        }
    };

    if (commonJSModule) {
        module.exports = collection;
    } else {
        sinon.collection = collection;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":55}],58:[function(require,module,exports){
/* @depend ../sinon.js */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Match functions
 *
 * @author Maximilian Antoni (mail@maxantoni.de)
 * @license BSD
 *
 * Copyright (c) 2012 Maximilian Antoni
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function assertType(value, type, name) {
        var actual = sinon.typeOf(value);
        if (actual !== type) {
            throw new TypeError("Expected type of " + name + " to be " +
                type + ", but was " + actual);
        }
    }

    var matcher = {
        toString: function () {
            return this.message;
        }
    };

    function isMatcher(object) {
        return matcher.isPrototypeOf(object);
    }

    function matchObject(expectation, actual) {
        if (actual === null || actual === undefined) {
            return false;
        }
        for (var key in expectation) {
            if (expectation.hasOwnProperty(key)) {
                var exp = expectation[key];
                var act = actual[key];
                if (match.isMatcher(exp)) {
                    if (!exp.test(act)) {
                        return false;
                    }
                } else if (sinon.typeOf(exp) === "object") {
                    if (!matchObject(exp, act)) {
                        return false;
                    }
                } else if (!sinon.deepEqual(exp, act)) {
                    return false;
                }
            }
        }
        return true;
    }

    matcher.or = function (m2) {
        if (!isMatcher(m2)) {
            throw new TypeError("Matcher expected");
        }
        var m1 = this;
        var or = sinon.create(matcher);
        or.test = function (actual) {
            return m1.test(actual) || m2.test(actual);
        };
        or.message = m1.message + ".or(" + m2.message + ")";
        return or;
    };

    matcher.and = function (m2) {
        if (!isMatcher(m2)) {
            throw new TypeError("Matcher expected");
        }
        var m1 = this;
        var and = sinon.create(matcher);
        and.test = function (actual) {
            return m1.test(actual) && m2.test(actual);
        };
        and.message = m1.message + ".and(" + m2.message + ")";
        return and;
    };

    var match = function (expectation, message) {
        var m = sinon.create(matcher);
        var type = sinon.typeOf(expectation);
        switch (type) {
        case "object":
            if (typeof expectation.test === "function") {
                m.test = function (actual) {
                    return expectation.test(actual) === true;
                };
                m.message = "match(" + sinon.functionName(expectation.test) + ")";
                return m;
            }
            var str = [];
            for (var key in expectation) {
                if (expectation.hasOwnProperty(key)) {
                    str.push(key + ": " + expectation[key]);
                }
            }
            m.test = function (actual) {
                return matchObject(expectation, actual);
            };
            m.message = "match(" + str.join(", ") + ")";
            break;
        case "number":
            m.test = function (actual) {
                return expectation == actual;
            };
            break;
        case "string":
            m.test = function (actual) {
                if (typeof actual !== "string") {
                    return false;
                }
                return actual.indexOf(expectation) !== -1;
            };
            m.message = "match(\"" + expectation + "\")";
            break;
        case "regexp":
            m.test = function (actual) {
                if (typeof actual !== "string") {
                    return false;
                }
                return expectation.test(actual);
            };
            break;
        case "function":
            m.test = expectation;
            if (message) {
                m.message = message;
            } else {
                m.message = "match(" + sinon.functionName(expectation) + ")";
            }
            break;
        default:
            m.test = function (actual) {
              return sinon.deepEqual(expectation, actual);
            };
        }
        if (!m.message) {
            m.message = "match(" + expectation + ")";
        }
        return m;
    };

    match.isMatcher = isMatcher;

    match.any = match(function () {
        return true;
    }, "any");

    match.defined = match(function (actual) {
        return actual !== null && actual !== undefined;
    }, "defined");

    match.truthy = match(function (actual) {
        return !!actual;
    }, "truthy");

    match.falsy = match(function (actual) {
        return !actual;
    }, "falsy");

    match.same = function (expectation) {
        return match(function (actual) {
            return expectation === actual;
        }, "same(" + expectation + ")");
    };

    match.typeOf = function (type) {
        assertType(type, "string", "type");
        return match(function (actual) {
            return sinon.typeOf(actual) === type;
        }, "typeOf(\"" + type + "\")");
    };

    match.instanceOf = function (type) {
        assertType(type, "function", "type");
        return match(function (actual) {
            return actual instanceof type;
        }, "instanceOf(" + sinon.functionName(type) + ")");
    };

    function createPropertyMatcher(propertyTest, messagePrefix) {
        return function (property, value) {
            assertType(property, "string", "property");
            var onlyProperty = arguments.length === 1;
            var message = messagePrefix + "(\"" + property + "\"";
            if (!onlyProperty) {
                message += ", " + value;
            }
            message += ")";
            return match(function (actual) {
                if (actual === undefined || actual === null ||
                        !propertyTest(actual, property)) {
                    return false;
                }
                return onlyProperty || sinon.deepEqual(value, actual[property]);
            }, message);
        };
    }

    match.has = createPropertyMatcher(function (actual, property) {
        if (typeof actual === "object") {
            return property in actual;
        }
        return actual[property] !== undefined;
    }, "has");

    match.hasOwn = createPropertyMatcher(function (actual, property) {
        return actual.hasOwnProperty(property);
    }, "hasOwn");

    match.bool = match.typeOf("boolean");
    match.number = match.typeOf("number");
    match.string = match.typeOf("string");
    match.object = match.typeOf("object");
    match.func = match.typeOf("function");
    match.array = match.typeOf("array");
    match.regexp = match.typeOf("regexp");
    match.date = match.typeOf("date");

    if (commonJSModule) {
        module.exports = match;
    } else {
        sinon.match = match;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":55}],59:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false*/
/*global module, require, sinon*/
/**
 * Mock functions.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";
    var push = [].push;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function mock(object) {
        if (!object) {
            return sinon.expectation.create("Anonymous mock");
        }

        return mock.create(object);
    }

    sinon.mock = mock;

    sinon.extend(mock, (function () {
        function each(collection, callback) {
            if (!collection) {
                return;
            }

            for (var i = 0, l = collection.length; i < l; i += 1) {
                callback(collection[i]);
            }
        }

        return {
            create: function create(object) {
                if (!object) {
                    throw new TypeError("object is null");
                }

                var mockObject = sinon.extend({}, mock);
                mockObject.object = object;
                delete mockObject.create;

                return mockObject;
            },

            expects: function expects(method) {
                if (!method) {
                    throw new TypeError("method is falsy");
                }

                if (!this.expectations) {
                    this.expectations = {};
                    this.proxies = [];
                }

                if (!this.expectations[method]) {
                    this.expectations[method] = [];
                    var mockObject = this;

                    sinon.wrapMethod(this.object, method, function () {
                        return mockObject.invokeMethod(method, this, arguments);
                    });

                    push.call(this.proxies, method);
                }

                var expectation = sinon.expectation.create(method);
                push.call(this.expectations[method], expectation);

                return expectation;
            },

            restore: function restore() {
                var object = this.object;

                each(this.proxies, function (proxy) {
                    if (typeof object[proxy].restore == "function") {
                        object[proxy].restore();
                    }
                });
            },

            verify: function verify() {
                var expectations = this.expectations || {};
                var messages = [], met = [];

                each(this.proxies, function (proxy) {
                    each(expectations[proxy], function (expectation) {
                        if (!expectation.met()) {
                            push.call(messages, expectation.toString());
                        } else {
                            push.call(met, expectation.toString());
                        }
                    });
                });

                this.restore();

                if (messages.length > 0) {
                    sinon.expectation.fail(messages.concat(met).join("\n"));
                } else {
                    sinon.expectation.pass(messages.concat(met).join("\n"));
                }

                return true;
            },

            invokeMethod: function invokeMethod(method, thisValue, args) {
                var expectations = this.expectations && this.expectations[method];
                var length = expectations && expectations.length || 0, i;

                for (i = 0; i < length; i += 1) {
                    if (!expectations[i].met() &&
                        expectations[i].allowsCall(thisValue, args)) {
                        return expectations[i].apply(thisValue, args);
                    }
                }

                var messages = [], available, exhausted = 0;

                for (i = 0; i < length; i += 1) {
                    if (expectations[i].allowsCall(thisValue, args)) {
                        available = available || expectations[i];
                    } else {
                        exhausted += 1;
                    }
                    push.call(messages, "    " + expectations[i].toString());
                }

                if (exhausted === 0) {
                    return available.apply(thisValue, args);
                }

                messages.unshift("Unexpected call: " + sinon.spyCall.toString.call({
                    proxy: method,
                    args: args
                }));

                sinon.expectation.fail(messages.join("\n"));
            }
        };
    }()));

    var times = sinon.timesInWords;

    sinon.expectation = (function () {
        var slice = Array.prototype.slice;
        var _invoke = sinon.spy.invoke;

        function callCountInWords(callCount) {
            if (callCount == 0) {
                return "never called";
            } else {
                return "called " + times(callCount);
            }
        }

        function expectedCallCountInWords(expectation) {
            var min = expectation.minCalls;
            var max = expectation.maxCalls;

            if (typeof min == "number" && typeof max == "number") {
                var str = times(min);

                if (min != max) {
                    str = "at least " + str + " and at most " + times(max);
                }

                return str;
            }

            if (typeof min == "number") {
                return "at least " + times(min);
            }

            return "at most " + times(max);
        }

        function receivedMinCalls(expectation) {
            var hasMinLimit = typeof expectation.minCalls == "number";
            return !hasMinLimit || expectation.callCount >= expectation.minCalls;
        }

        function receivedMaxCalls(expectation) {
            if (typeof expectation.maxCalls != "number") {
                return false;
            }

            return expectation.callCount == expectation.maxCalls;
        }

        return {
            minCalls: 1,
            maxCalls: 1,

            create: function create(methodName) {
                var expectation = sinon.extend(sinon.stub.create(), sinon.expectation);
                delete expectation.create;
                expectation.method = methodName;

                return expectation;
            },

            invoke: function invoke(func, thisValue, args) {
                this.verifyCallAllowed(thisValue, args);

                return _invoke.apply(this, arguments);
            },

            atLeast: function atLeast(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.maxCalls = null;
                    this.limitsSet = true;
                }

                this.minCalls = num;

                return this;
            },

            atMost: function atMost(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.minCalls = null;
                    this.limitsSet = true;
                }

                this.maxCalls = num;

                return this;
            },

            never: function never() {
                return this.exactly(0);
            },

            once: function once() {
                return this.exactly(1);
            },

            twice: function twice() {
                return this.exactly(2);
            },

            thrice: function thrice() {
                return this.exactly(3);
            },

            exactly: function exactly(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not a number");
                }

                this.atLeast(num);
                return this.atMost(num);
            },

            met: function met() {
                return !this.failed && receivedMinCalls(this);
            },

            verifyCallAllowed: function verifyCallAllowed(thisValue, args) {
                if (receivedMaxCalls(this)) {
                    this.failed = true;
                    sinon.expectation.fail(this.method + " already called " + times(this.maxCalls));
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    sinon.expectation.fail(this.method + " called with " + thisValue + " as thisValue, expected " +
                        this.expectedThis);
                }

                if (!("expectedArguments" in this)) {
                    return;
                }

                if (!args) {
                    sinon.expectation.fail(this.method + " received no arguments, expected " +
                        sinon.format(this.expectedArguments));
                }

                if (args.length < this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too few arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too many arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {
                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        sinon.expectation.fail(this.method + " received wrong arguments " + sinon.format(args) +
                            ", expected " + sinon.format(this.expectedArguments));
                    }
                }
            },

            allowsCall: function allowsCall(thisValue, args) {
                if (this.met() && receivedMaxCalls(this)) {
                    return false;
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    return false;
                }

                if (!("expectedArguments" in this)) {
                    return true;
                }

                args = args || [];

                if (args.length < this.expectedArguments.length) {
                    return false;
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    return false;
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {
                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        return false;
                    }
                }

                return true;
            },

            withArgs: function withArgs() {
                this.expectedArguments = slice.call(arguments);
                return this;
            },

            withExactArgs: function withExactArgs() {
                this.withArgs.apply(this, arguments);
                this.expectsExactArgCount = true;
                return this;
            },

            on: function on(thisValue) {
                this.expectedThis = thisValue;
                return this;
            },

            toString: function () {
                var args = (this.expectedArguments || []).slice();

                if (!this.expectsExactArgCount) {
                    push.call(args, "[...]");
                }

                var callStr = sinon.spyCall.toString.call({
                    proxy: this.method || "anonymous mock expectation",
                    args: args
                });

                var message = callStr.replace(", [...", "[, ...") + " " +
                    expectedCallCountInWords(this);

                if (this.met()) {
                    return "Expectation met: " + message;
                }

                return "Expected " + message + " (" +
                    callCountInWords(this.callCount) + ")";
            },

            verify: function verify() {
                if (!this.met()) {
                    sinon.expectation.fail(this.toString());
                } else {
                    sinon.expectation.pass(this.toString());
                }

                return true;
            },

            pass: function(message) {
              sinon.assert.pass(message);
            },
            fail: function (message) {
                var exception = new Error(message);
                exception.name = "ExpectationError";

                throw exception;
            }
        };
    }());

    if (commonJSModule) {
        module.exports = mock;
    } else {
        sinon.mock = mock;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":55}],60:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend collection.js
 * @depend util/fake_timers.js
 * @depend util/fake_server_with_clock.js
 */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global require, module*/
/**
 * Manages fake collections as well as fake utilities such as Sinon's
 * timers and fake XHR implementation in one convenient object.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

if (typeof module == "object" && typeof require == "function") {
    var sinon = require("../sinon");
    sinon.extend(sinon, require("./util/fake_timers"));
}

(function () {
    var push = [].push;

    function exposeValue(sandbox, config, key, value) {
        if (!value) {
            return;
        }

        if (config.injectInto) {
            config.injectInto[key] = value;
        } else {
            push.call(sandbox.args, value);
        }
    }

    function prepareSandboxFromConfig(config) {
        var sandbox = sinon.create(sinon.sandbox);

        if (config.useFakeServer) {
            if (typeof config.useFakeServer == "object") {
                sandbox.serverPrototype = config.useFakeServer;
            }

            sandbox.useFakeServer();
        }

        if (config.useFakeTimers) {
            if (typeof config.useFakeTimers == "object") {
                sandbox.useFakeTimers.apply(sandbox, config.useFakeTimers);
            } else {
                sandbox.useFakeTimers();
            }
        }

        return sandbox;
    }

    sinon.sandbox = sinon.extend(sinon.create(sinon.collection), {
        useFakeTimers: function useFakeTimers() {
            this.clock = sinon.useFakeTimers.apply(sinon, arguments);

            return this.add(this.clock);
        },

        serverPrototype: sinon.fakeServer,

        useFakeServer: function useFakeServer() {
            var proto = this.serverPrototype || sinon.fakeServer;

            if (!proto || !proto.create) {
                return null;
            }

            this.server = proto.create();
            return this.add(this.server);
        },

        inject: function (obj) {
            sinon.collection.inject.call(this, obj);

            if (this.clock) {
                obj.clock = this.clock;
            }

            if (this.server) {
                obj.server = this.server;
                obj.requests = this.server.requests;
            }

            return obj;
        },

        create: function (config) {
            if (!config) {
                return sinon.create(sinon.sandbox);
            }

            var sandbox = prepareSandboxFromConfig(config);
            sandbox.args = sandbox.args || [];
            var prop, value, exposed = sandbox.inject({});

            if (config.properties) {
                for (var i = 0, l = config.properties.length; i < l; i++) {
                    prop = config.properties[i];
                    value = exposed[prop] || prop == "sandbox" && sandbox;
                    exposeValue(sandbox, config, prop, value);
                }
            } else {
                exposeValue(sandbox, config, "sandbox", value);
            }

            return sandbox;
        }
    });

    sinon.sandbox.useFakeXMLHttpRequest = sinon.sandbox.useFakeServer;

    if (typeof module == "object" && typeof require == "function") {
        module.exports = sinon.sandbox;
    }
}());

},{"../sinon":55,"./util/fake_timers":65}],61:[function(require,module,exports){
/**
  * @depend ../sinon.js
  * @depend match.js
  */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
  * Spy calls
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @author Maximilian Antoni (mail@maxantoni.de)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  * Copyright (c) 2013 Maximilian Antoni
  */
"use strict";

var commonJSModule = typeof module == "object" && typeof require == "function";

if (!this.sinon && commonJSModule) {
    var sinon = require("../sinon");
}

(function (sinon) {
    function throwYieldError(proxy, text, args) {
        var msg = sinon.functionName(proxy) + text;
        if (args.length) {
            msg += " Received [" + slice.call(args).join(", ") + "]";
        }
        throw new Error(msg);
    }

    var slice = Array.prototype.slice;

    var callProto = {
        calledOn: function calledOn(thisValue) {
            if (sinon.match && sinon.match.isMatcher(thisValue)) {
                return thisValue.test(this.thisValue);
            }
            return this.thisValue === thisValue;
        },

        calledWith: function calledWith() {
            for (var i = 0, l = arguments.length; i < l; i += 1) {
                if (!sinon.deepEqual(arguments[i], this.args[i])) {
                    return false;
                }
            }

            return true;
        },

        calledWithMatch: function calledWithMatch() {
            for (var i = 0, l = arguments.length; i < l; i += 1) {
                var actual = this.args[i];
                var expectation = arguments[i];
                if (!sinon.match || !sinon.match(expectation).test(actual)) {
                    return false;
                }
            }
            return true;
        },

        calledWithExactly: function calledWithExactly() {
            return arguments.length == this.args.length &&
                this.calledWith.apply(this, arguments);
        },

        notCalledWith: function notCalledWith() {
            return !this.calledWith.apply(this, arguments);
        },

        notCalledWithMatch: function notCalledWithMatch() {
            return !this.calledWithMatch.apply(this, arguments);
        },

        returned: function returned(value) {
            return sinon.deepEqual(value, this.returnValue);
        },

        threw: function threw(error) {
            if (typeof error === "undefined" || !this.exception) {
                return !!this.exception;
            }

            return this.exception === error || this.exception.name === error;
        },

        calledWithNew: function calledWithNew(thisValue) {
            return this.thisValue instanceof this.proxy;
        },

        calledBefore: function (other) {
            return this.callId < other.callId;
        },

        calledAfter: function (other) {
            return this.callId > other.callId;
        },

        callArg: function (pos) {
            this.args[pos]();
        },

        callArgOn: function (pos, thisValue) {
            this.args[pos].apply(thisValue);
        },

        callArgWith: function (pos) {
            this.callArgOnWith.apply(this, [pos, null].concat(slice.call(arguments, 1)));
        },

        callArgOnWith: function (pos, thisValue) {
            var args = slice.call(arguments, 2);
            this.args[pos].apply(thisValue, args);
        },

        "yield": function () {
            this.yieldOn.apply(this, [null].concat(slice.call(arguments, 0)));
        },

        yieldOn: function (thisValue) {
            var args = this.args;
            for (var i = 0, l = args.length; i < l; ++i) {
                if (typeof args[i] === "function") {
                    args[i].apply(thisValue, slice.call(arguments, 1));
                    return;
                }
            }
            throwYieldError(this.proxy, " cannot yield since no callback was passed.", args);
        },

        yieldTo: function (prop) {
            this.yieldToOn.apply(this, [prop, null].concat(slice.call(arguments, 1)));
        },

        yieldToOn: function (prop, thisValue) {
            var args = this.args;
            for (var i = 0, l = args.length; i < l; ++i) {
                if (args[i] && typeof args[i][prop] === "function") {
                    args[i][prop].apply(thisValue, slice.call(arguments, 2));
                    return;
                }
            }
            throwYieldError(this.proxy, " cannot yield to '" + prop +
                "' since no callback was passed.", args);
        },

        toString: function () {
            var callStr = this.proxy.toString() + "(";
            var args = [];

            for (var i = 0, l = this.args.length; i < l; ++i) {
                args.push(sinon.format(this.args[i]));
            }

            callStr = callStr + args.join(", ") + ")";

            if (typeof this.returnValue != "undefined") {
                callStr += " => " + sinon.format(this.returnValue);
            }

            if (this.exception) {
                callStr += " !" + this.exception.name;

                if (this.exception.message) {
                    callStr += "(" + this.exception.message + ")";
                }
            }

            return callStr;
        }
    };

    callProto.invokeCallback = callProto.yield;

    function createSpyCall(spy, thisValue, args, returnValue, exception, id) {
        if (typeof id !== "number") {
            throw new TypeError("Call id is not a number");
        }
        var proxyCall = sinon.create(callProto);
        proxyCall.proxy = spy;
        proxyCall.thisValue = thisValue;
        proxyCall.args = args;
        proxyCall.returnValue = returnValue;
        proxyCall.exception = exception;
        proxyCall.callId = id;

        return proxyCall;
    };
    createSpyCall.toString = callProto.toString; // used by mocks

    sinon.spyCall = createSpyCall;
}(typeof sinon == "object" && sinon || null));

/**
  * @depend ../sinon.js
  */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
  * Spy functions
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";
    var push = Array.prototype.push;
    var slice = Array.prototype.slice;
    var callId = 0;

    function spy(object, property) {
        if (!property && typeof object == "function") {
            return spy.create(object);
        }

        if (!object && !property) {
            return spy.create(function () { });
        }

        var method = object[property];
        return sinon.wrapMethod(object, property, spy.create(method));
    }

    function matchingFake(fakes, args, strict) {
        if (!fakes) {
            return;
        }

        var alen = args.length;

        for (var i = 0, l = fakes.length; i < l; i++) {
            if (fakes[i].matches(args, strict)) {
                return fakes[i];
            }
        }
    }

    function incrementCallCount() {
        this.called = true;
        this.callCount += 1;
        this.notCalled = false;
        this.calledOnce = this.callCount == 1;
        this.calledTwice = this.callCount == 2;
        this.calledThrice = this.callCount == 3;
    }

    function createCallProperties() {
        this.firstCall = this.getCall(0);
        this.secondCall = this.getCall(1);
        this.thirdCall = this.getCall(2);
        this.lastCall = this.getCall(this.callCount - 1);
    }

    var vars = "a,b,c,d,e,f,g,h,i,j,k,l";
    function createProxy(func) {
        // Retain the function length:
        var p;
        if (func.length) {
            eval("p = (function proxy(" + vars.substring(0, func.length * 2 - 1) +
                ") { return p.invoke(func, this, slice.call(arguments)); });");
        }
        else {
            p = function proxy() {
                return p.invoke(func, this, slice.call(arguments));
            };
        }
        return p;
    }

    var uuid = 0;

    // Public API
    var spyApi = {
        reset: function () {
            this.called = false;
            this.notCalled = true;
            this.calledOnce = false;
            this.calledTwice = false;
            this.calledThrice = false;
            this.callCount = 0;
            this.firstCall = null;
            this.secondCall = null;
            this.thirdCall = null;
            this.lastCall = null;
            this.args = [];
            this.returnValues = [];
            this.thisValues = [];
            this.exceptions = [];
            this.callIds = [];
            if (this.fakes) {
                for (var i = 0; i < this.fakes.length; i++) {
                    this.fakes[i].reset();
                }
            }
        },

        create: function create(func) {
            var name;

            if (typeof func != "function") {
                func = function () { };
            } else {
                name = sinon.functionName(func);
            }

            var proxy = createProxy(func);

            sinon.extend(proxy, spy);
            delete proxy.create;
            sinon.extend(proxy, func);

            proxy.reset();
            proxy.prototype = func.prototype;
            proxy.displayName = name || "spy";
            proxy.toString = sinon.functionToString;
            proxy._create = sinon.spy.create;
            proxy.id = "spy#" + uuid++;

            return proxy;
        },

        invoke: function invoke(func, thisValue, args) {
            var matching = matchingFake(this.fakes, args);
            var exception, returnValue;

            incrementCallCount.call(this);
            push.call(this.thisValues, thisValue);
            push.call(this.args, args);
            push.call(this.callIds, callId++);

            try {
                if (matching) {
                    returnValue = matching.invoke(func, thisValue, args);
                } else {
                    returnValue = (this.func || func).apply(thisValue, args);
                }
            } catch (e) {
                push.call(this.returnValues, undefined);
                exception = e;
                throw e;
            } finally {
                push.call(this.exceptions, exception);
            }

            push.call(this.returnValues, returnValue);

            createCallProperties.call(this);

            return returnValue;
        },

        getCall: function getCall(i) {
            if (i < 0 || i >= this.callCount) {
                return null;
            }

            return sinon.spyCall(this, this.thisValues[i], this.args[i],
                                    this.returnValues[i], this.exceptions[i],
                                    this.callIds[i]);
        },

        calledBefore: function calledBefore(spyFn) {
            if (!this.called) {
                return false;
            }

            if (!spyFn.called) {
                return true;
            }

            return this.callIds[0] < spyFn.callIds[spyFn.callIds.length - 1];
        },

        calledAfter: function calledAfter(spyFn) {
            if (!this.called || !spyFn.called) {
                return false;
            }

            return this.callIds[this.callCount - 1] > spyFn.callIds[spyFn.callCount - 1];
        },

        withArgs: function () {
            var args = slice.call(arguments);

            if (this.fakes) {
                var match = matchingFake(this.fakes, args, true);

                if (match) {
                    return match;
                }
            } else {
                this.fakes = [];
            }

            var original = this;
            var fake = this._create();
            fake.matchingAguments = args;
            push.call(this.fakes, fake);

            fake.withArgs = function () {
                return original.withArgs.apply(original, arguments);
            };

            for (var i = 0; i < this.args.length; i++) {
                if (fake.matches(this.args[i])) {
                    incrementCallCount.call(fake);
                    push.call(fake.thisValues, this.thisValues[i]);
                    push.call(fake.args, this.args[i]);
                    push.call(fake.returnValues, this.returnValues[i]);
                    push.call(fake.exceptions, this.exceptions[i]);
                    push.call(fake.callIds, this.callIds[i]);
                }
            }
            createCallProperties.call(fake);

            return fake;
        },

        matches: function (args, strict) {
            var margs = this.matchingAguments;

            if (margs.length <= args.length &&
                sinon.deepEqual(margs, args.slice(0, margs.length))) {
                return !strict || margs.length == args.length;
            }
        },

        printf: function (format) {
            var spy = this;
            var args = slice.call(arguments, 1);
            var formatter;

            return (format || "").replace(/%(.)/g, function (match, specifyer) {
                formatter = spyApi.formatters[specifyer];

                if (typeof formatter == "function") {
                    return formatter.call(null, spy, args);
                } else if (!isNaN(parseInt(specifyer), 10)) {
                    return sinon.format(args[specifyer - 1]);
                }

                return "%" + specifyer;
            });
        }
    };

    function delegateToCalls(method, matchAny, actual, notCalled) {
        spyApi[method] = function () {
            if (!this.called) {
                if (notCalled) {
                    return notCalled.apply(this, arguments);
                }
                return false;
            }

            var currentCall;
            var matches = 0;

            for (var i = 0, l = this.callCount; i < l; i += 1) {
                currentCall = this.getCall(i);

                if (currentCall[actual || method].apply(currentCall, arguments)) {
                    matches += 1;

                    if (matchAny) {
                        return true;
                    }
                }
            }

            return matches === this.callCount;
        };
    }

    delegateToCalls("calledOn", true);
    delegateToCalls("alwaysCalledOn", false, "calledOn");
    delegateToCalls("calledWith", true);
    delegateToCalls("calledWithMatch", true);
    delegateToCalls("alwaysCalledWith", false, "calledWith");
    delegateToCalls("alwaysCalledWithMatch", false, "calledWithMatch");
    delegateToCalls("calledWithExactly", true);
    delegateToCalls("alwaysCalledWithExactly", false, "calledWithExactly");
    delegateToCalls("neverCalledWith", false, "notCalledWith",
        function () { return true; });
    delegateToCalls("neverCalledWithMatch", false, "notCalledWithMatch",
        function () { return true; });
    delegateToCalls("threw", true);
    delegateToCalls("alwaysThrew", false, "threw");
    delegateToCalls("returned", true);
    delegateToCalls("alwaysReturned", false, "returned");
    delegateToCalls("calledWithNew", true);
    delegateToCalls("alwaysCalledWithNew", false, "calledWithNew");
    delegateToCalls("callArg", false, "callArgWith", function () {
        throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
    });
    spyApi.callArgWith = spyApi.callArg;
    delegateToCalls("callArgOn", false, "callArgOnWith", function () {
        throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
    });
    spyApi.callArgOnWith = spyApi.callArgOn;
    delegateToCalls("yield", false, "yield", function () {
        throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
    });
    // "invokeCallback" is an alias for "yield" since "yield" is invalid in strict mode.
    spyApi.invokeCallback = spyApi.yield;
    delegateToCalls("yieldOn", false, "yieldOn", function () {
        throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
    });
    delegateToCalls("yieldTo", false, "yieldTo", function (property) {
        throw new Error(this.toString() + " cannot yield to '" + property +
            "' since it was not yet invoked.");
    });
    delegateToCalls("yieldToOn", false, "yieldToOn", function (property) {
        throw new Error(this.toString() + " cannot yield to '" + property +
            "' since it was not yet invoked.");
    });

    spyApi.formatters = {
        "c": function (spy) {
            return sinon.timesInWords(spy.callCount);
        },

        "n": function (spy) {
            return spy.toString();
        },

        "C": function (spy) {
            var calls = [];

            for (var i = 0, l = spy.callCount; i < l; ++i) {
                var stringifiedCall = "    " + spy.getCall(i).toString();
                if (/\n/.test(calls[i - 1])) {
                    stringifiedCall = "\n" + stringifiedCall;
                }
                push.call(calls, stringifiedCall);
            }

            return calls.length > 0 ? "\n" + calls.join("\n") : "";
        },

        "t": function (spy) {
            var objects = [];

            for (var i = 0, l = spy.callCount; i < l; ++i) {
                push.call(objects, sinon.format(spy.thisValues[i]));
            }

            return objects.join(", ");
        },

        "*": function (spy, args) {
            var formatted = [];

            for (var i = 0, l = args.length; i < l; ++i) {
                push.call(formatted, sinon.format(args[i]));
            }

            return formatted.join(", ");
        }
    };

    sinon.extend(spy, spyApi);

    spy.spyCall = sinon.spyCall;

    if (commonJSModule) {
        module.exports = spy;
    } else {
        sinon.spy = spy;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":55}],62:[function(require,module,exports){
var process=require("__browserify_process");/**
 * @depend ../sinon.js
 * @depend spy.js
 */
/*jslint eqeqeq: false, onevar: false*/
/*global module, require, sinon*/
/**
 * Stub functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function stub(object, property, func) {
        if (!!func && typeof func != "function") {
            throw new TypeError("Custom stub should be function");
        }

        var wrapper;

        if (func) {
            wrapper = sinon.spy && sinon.spy.create ? sinon.spy.create(func) : func;
        } else {
            wrapper = stub.create();
        }

        if (!object && !property) {
            return sinon.stub.create();
        }

        if (!property && !!object && typeof object == "object") {
            for (var prop in object) {
                if (typeof object[prop] === "function") {
                    stub(object, prop);
                }
            }

            return object;
        }

        return sinon.wrapMethod(object, property, wrapper);
    }

    function getChangingValue(stub, property) {
        var index = stub.callCount - 1;
        var values = stub[property];
        var prop = index in values ? values[index] : values[values.length - 1];
        stub[property + "Last"] = prop;

        return prop;
    }

    function getCallback(stub, args) {
        var callArgAt = getChangingValue(stub, "callArgAts");

        if (callArgAt < 0) {
            var callArgProp = getChangingValue(stub, "callArgProps");

            for (var i = 0, l = args.length; i < l; ++i) {
                if (!callArgProp && typeof args[i] == "function") {
                    return args[i];
                }

                if (callArgProp && args[i] &&
                    typeof args[i][callArgProp] == "function") {
                    return args[i][callArgProp];
                }
            }

            return null;
        }

        return args[callArgAt];
    }

    var join = Array.prototype.join;

    function getCallbackError(stub, func, args) {
        if (stub.callArgAtsLast < 0) {
            var msg;

            if (stub.callArgPropsLast) {
                msg = sinon.functionName(stub) +
                    " expected to yield to '" + stub.callArgPropsLast +
                    "', but no object with such a property was passed."
            } else {
                msg = sinon.functionName(stub) +
                            " expected to yield, but no callback was passed."
            }

            if (args.length > 0) {
                msg += " Received [" + join.call(args, ", ") + "]";
            }

            return msg;
        }

        return "argument at index " + stub.callArgAtsLast + " is not a function: " + func;
    }

    var nextTick = (function () {
        if (typeof process === "object" && typeof process.nextTick === "function") {
            return process.nextTick;
        } else if (typeof setImmediate === "function") {
            return setImmediate;
        } else {
            return function (callback) {
                setTimeout(callback, 0);
            };
        }
    })();

    function callCallback(stub, args) {
        if (stub.callArgAts.length > 0) {
            var func = getCallback(stub, args);

            if (typeof func != "function") {
                throw new TypeError(getCallbackError(stub, func, args));
            }

            var callbackArguments = getChangingValue(stub, "callbackArguments");
            var callbackContext = getChangingValue(stub, "callbackContexts");

            if (stub.callbackAsync) {
                nextTick(function() {
                    func.apply(callbackContext, callbackArguments);
                });
            } else {
                func.apply(callbackContext, callbackArguments);
            }
        }
    }

    var uuid = 0;

    sinon.extend(stub, (function () {
        var slice = Array.prototype.slice, proto;

        function throwsException(error, message) {
            if (typeof error == "string") {
                this.exception = new Error(message || "");
                this.exception.name = error;
            } else if (!error) {
                this.exception = new Error("Error");
            } else {
                this.exception = error;
            }

            return this;
        }

        proto = {
            create: function create() {
                var functionStub = function () {

                    callCallback(functionStub, arguments);

                    if (functionStub.exception) {
                        throw functionStub.exception;
                    } else if (typeof functionStub.returnArgAt == 'number') {
                        return arguments[functionStub.returnArgAt];
                    } else if (functionStub.returnThis) {
                        return this;
                    }
                    return functionStub.returnValue;
                };

                functionStub.id = "stub#" + uuid++;
                var orig = functionStub;
                functionStub = sinon.spy.create(functionStub);
                functionStub.func = orig;

                functionStub.callArgAts = [];
                functionStub.callbackArguments = [];
                functionStub.callbackContexts = [];
                functionStub.callArgProps = [];

                sinon.extend(functionStub, stub);
                functionStub._create = sinon.stub.create;
                functionStub.displayName = "stub";
                functionStub.toString = sinon.functionToString;

                return functionStub;
            },

            resetBehavior: function () {
                var i;

                this.callArgAts = [];
                this.callbackArguments = [];
                this.callbackContexts = [];
                this.callArgProps = [];

                delete this.returnValue;
                delete this.returnArgAt;
                this.returnThis = false;

                if (this.fakes) {
                    for (i = 0; i < this.fakes.length; i++) {
                        this.fakes[i].resetBehavior();
                    }
                }
            },

            returns: function returns(value) {
                this.returnValue = value;

                return this;
            },

            returnsArg: function returnsArg(pos) {
                if (typeof pos != "number") {
                    throw new TypeError("argument index is not number");
                }

                this.returnArgAt = pos;

                return this;
            },

            returnsThis: function returnsThis() {
                this.returnThis = true;

                return this;
            },

            "throws": throwsException,
            throwsException: throwsException,

            callsArg: function callsArg(pos) {
                if (typeof pos != "number") {
                    throw new TypeError("argument index is not number");
                }

                this.callArgAts.push(pos);
                this.callbackArguments.push([]);
                this.callbackContexts.push(undefined);
                this.callArgProps.push(undefined);

                return this;
            },

            callsArgOn: function callsArgOn(pos, context) {
                if (typeof pos != "number") {
                    throw new TypeError("argument index is not number");
                }
                if (typeof context != "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAts.push(pos);
                this.callbackArguments.push([]);
                this.callbackContexts.push(context);
                this.callArgProps.push(undefined);

                return this;
            },

            callsArgWith: function callsArgWith(pos) {
                if (typeof pos != "number") {
                    throw new TypeError("argument index is not number");
                }

                this.callArgAts.push(pos);
                this.callbackArguments.push(slice.call(arguments, 1));
                this.callbackContexts.push(undefined);
                this.callArgProps.push(undefined);

                return this;
            },

            callsArgOnWith: function callsArgWith(pos, context) {
                if (typeof pos != "number") {
                    throw new TypeError("argument index is not number");
                }
                if (typeof context != "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAts.push(pos);
                this.callbackArguments.push(slice.call(arguments, 2));
                this.callbackContexts.push(context);
                this.callArgProps.push(undefined);

                return this;
            },

            yields: function () {
                this.callArgAts.push(-1);
                this.callbackArguments.push(slice.call(arguments, 0));
                this.callbackContexts.push(undefined);
                this.callArgProps.push(undefined);

                return this;
            },

            yieldsOn: function (context) {
                if (typeof context != "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAts.push(-1);
                this.callbackArguments.push(slice.call(arguments, 1));
                this.callbackContexts.push(context);
                this.callArgProps.push(undefined);

                return this;
            },

            yieldsTo: function (prop) {
                this.callArgAts.push(-1);
                this.callbackArguments.push(slice.call(arguments, 1));
                this.callbackContexts.push(undefined);
                this.callArgProps.push(prop);

                return this;
            },

            yieldsToOn: function (prop, context) {
                if (typeof context != "object") {
                    throw new TypeError("argument context is not an object");
                }

                this.callArgAts.push(-1);
                this.callbackArguments.push(slice.call(arguments, 2));
                this.callbackContexts.push(context);
                this.callArgProps.push(prop);

                return this;
            }
        };

        // create asynchronous versions of callsArg* and yields* methods
        for (var method in proto) {
            // need to avoid creating anotherasync versions of the newly added async methods
            if (proto.hasOwnProperty(method) &&
                method.match(/^(callsArg|yields|thenYields$)/) &&
                !method.match(/Async/)) {
                proto[method + 'Async'] = (function (syncFnName) {
                    return function () {
                        this.callbackAsync = true;
                        return this[syncFnName].apply(this, arguments);
                    };
                })(method);
            }
        }

        return proto;

    }()));

    if (commonJSModule) {
        module.exports = stub;
    } else {
        sinon.stub = stub;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":55,"__browserify_process":16}],63:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 * @depend sandbox.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true, plusplus: false*/
/*global module, require, sinon*/
/**
 * Test function, sandboxes fakes
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function test(callback) {
        var type = typeof callback;

        if (type != "function") {
            throw new TypeError("sinon.test needs to wrap a test function, got " + type);
        }

        return function () {
            var config = sinon.getConfig(sinon.config);
            config.injectInto = config.injectIntoThis && this || config.injectInto;
            var sandbox = sinon.sandbox.create(config);
            var exception, result;
            var args = Array.prototype.slice.call(arguments).concat(sandbox.args);

            try {
                result = callback.apply(this, args);
            } catch (e) {
                exception = e;
            }

            if (typeof exception !== "undefined") {
                sandbox.restore();
                throw exception;
            }
            else {
                sandbox.verifyAndRestore();
            }

            return result;
        };
    }

    test.config = {
        injectIntoThis: true,
        injectInto: null,
        properties: ["spy", "stub", "mock", "clock", "server", "requests"],
        useFakeTimers: true,
        useFakeServer: true
    };

    if (commonJSModule) {
        module.exports = test;
    } else {
        sinon.test = test;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":55}],64:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend test.js
 */
/*jslint eqeqeq: false, onevar: false, eqeqeq: false*/
/*global module, require, sinon*/
/**
 * Test case, sandboxes all test functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon || !Object.prototype.hasOwnProperty) {
        return;
    }

    function createTest(property, setUp, tearDown) {
        return function () {
            if (setUp) {
                setUp.apply(this, arguments);
            }

            var exception, result;

            try {
                result = property.apply(this, arguments);
            } catch (e) {
                exception = e;
            }

            if (tearDown) {
                tearDown.apply(this, arguments);
            }

            if (exception) {
                throw exception;
            }

            return result;
        };
    }

    function testCase(tests, prefix) {
        /*jsl:ignore*/
        if (!tests || typeof tests != "object") {
            throw new TypeError("sinon.testCase needs an object with test functions");
        }
        /*jsl:end*/

        prefix = prefix || "test";
        var rPrefix = new RegExp("^" + prefix);
        var methods = {}, testName, property, method;
        var setUp = tests.setUp;
        var tearDown = tests.tearDown;

        for (testName in tests) {
            if (tests.hasOwnProperty(testName)) {
                property = tests[testName];

                if (/^(setUp|tearDown)$/.test(testName)) {
                    continue;
                }

                if (typeof property == "function" && rPrefix.test(testName)) {
                    method = property;

                    if (setUp || tearDown) {
                        method = createTest(property, setUp, tearDown);
                    }

                    methods[testName] = sinon.test(method);
                } else {
                    methods[testName] = tests[testName];
                }
            }
        }

        return methods;
    }

    if (commonJSModule) {
        module.exports = testCase;
    } else {
        sinon.testCase = testCase;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":55}],65:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/*jslint eqeqeq: false, plusplus: false, evil: true, onevar: false, browser: true, forin: false*/
/*global module, require, window*/
/**
 * Fake timer API
 * setTimeout
 * setInterval
 * clearTimeout
 * clearInterval
 * tick
 * reset
 * Date
 *
 * Inspired by jsUnitMockTimeOut from JsUnit
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

if (typeof sinon == "undefined") {
    var sinon = {};
}

(function (global) {
    var id = 1;

    function addTimer(args, recurring) {
        if (args.length === 0) {
            throw new Error("Function requires at least 1 parameter");
        }

        var toId = id++;
        var delay = args[1] || 0;

        if (!this.timeouts) {
            this.timeouts = {};
        }

        this.timeouts[toId] = {
            id: toId,
            func: args[0],
            callAt: this.now + delay,
            invokeArgs: Array.prototype.slice.call(args, 2)
        };

        if (recurring === true) {
            this.timeouts[toId].interval = delay;
        }

        return toId;
    }

    function parseTime(str) {
        if (!str) {
            return 0;
        }

        var strings = str.split(":");
        var l = strings.length, i = l;
        var ms = 0, parsed;

        if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
            throw new Error("tick only understands numbers and 'h:m:s'");
        }

        while (i--) {
            parsed = parseInt(strings[i], 10);

            if (parsed >= 60) {
                throw new Error("Invalid time " + str);
            }

            ms += parsed * Math.pow(60, (l - i - 1));
        }

        return ms * 1000;
    }

    function createObject(object) {
        var newObject;

        if (Object.create) {
            newObject = Object.create(object);
        } else {
            var F = function () {};
            F.prototype = object;
            newObject = new F();
        }

        newObject.Date.clock = newObject;
        return newObject;
    }

    sinon.clock = {
        now: 0,

        create: function create(now) {
            var clock = createObject(this);

            if (typeof now == "number") {
                clock.now = now;
            }

            if (!!now && typeof now == "object") {
                throw new TypeError("now should be milliseconds since UNIX epoch");
            }

            return clock;
        },

        setTimeout: function setTimeout(callback, timeout) {
            return addTimer.call(this, arguments, false);
        },

        clearTimeout: function clearTimeout(timerId) {
            if (!this.timeouts) {
                this.timeouts = [];
            }

            if (timerId in this.timeouts) {
                delete this.timeouts[timerId];
            }
        },

        setInterval: function setInterval(callback, timeout) {
            return addTimer.call(this, arguments, true);
        },

        clearInterval: function clearInterval(timerId) {
            this.clearTimeout(timerId);
        },

        tick: function tick(ms) {
            ms = typeof ms == "number" ? ms : parseTime(ms);
            var tickFrom = this.now, tickTo = this.now + ms, previous = this.now;
            var timer = this.firstTimerInRange(tickFrom, tickTo);

            var firstException;
            while (timer && tickFrom <= tickTo) {
                if (this.timeouts[timer.id]) {
                    tickFrom = this.now = timer.callAt;
                    try {
                      this.callTimer(timer);
                    } catch (e) {
                      firstException = firstException || e;
                    }
                }

                timer = this.firstTimerInRange(previous, tickTo);
                previous = tickFrom;
            }

            this.now = tickTo;

            if (firstException) {
              throw firstException;
            }

            return this.now;
        },

        firstTimerInRange: function (from, to) {
            var timer, smallest, originalTimer;

            for (var id in this.timeouts) {
                if (this.timeouts.hasOwnProperty(id)) {
                    if (this.timeouts[id].callAt < from || this.timeouts[id].callAt > to) {
                        continue;
                    }

                    if (!smallest || this.timeouts[id].callAt < smallest) {
                        originalTimer = this.timeouts[id];
                        smallest = this.timeouts[id].callAt;

                        timer = {
                            func: this.timeouts[id].func,
                            callAt: this.timeouts[id].callAt,
                            interval: this.timeouts[id].interval,
                            id: this.timeouts[id].id,
                            invokeArgs: this.timeouts[id].invokeArgs
                        };
                    }
                }
            }

            return timer || null;
        },

        callTimer: function (timer) {
            if (typeof timer.interval == "number") {
                this.timeouts[timer.id].callAt += timer.interval;
            } else {
                delete this.timeouts[timer.id];
            }

            try {
                if (typeof timer.func == "function") {
                    timer.func.apply(null, timer.invokeArgs);
                } else {
                    eval(timer.func);
                }
            } catch (e) {
              var exception = e;
            }

            if (!this.timeouts[timer.id]) {
                if (exception) {
                  throw exception;
                }
                return;
            }

            if (exception) {
              throw exception;
            }
        },

        reset: function reset() {
            this.timeouts = {};
        },

        Date: (function () {
            var NativeDate = Date;

            function ClockDate(year, month, date, hour, minute, second, ms) {
                // Defensive and verbose to avoid potential harm in passing
                // explicit undefined when user does not pass argument
                switch (arguments.length) {
                case 0:
                    return new NativeDate(ClockDate.clock.now);
                case 1:
                    return new NativeDate(year);
                case 2:
                    return new NativeDate(year, month);
                case 3:
                    return new NativeDate(year, month, date);
                case 4:
                    return new NativeDate(year, month, date, hour);
                case 5:
                    return new NativeDate(year, month, date, hour, minute);
                case 6:
                    return new NativeDate(year, month, date, hour, minute, second);
                default:
                    return new NativeDate(year, month, date, hour, minute, second, ms);
                }
            }

            return mirrorDateProperties(ClockDate, NativeDate);
        }())
    };

    function mirrorDateProperties(target, source) {
        if (source.now) {
            target.now = function now() {
                return target.clock.now;
            };
        } else {
            delete target.now;
        }

        if (source.toSource) {
            target.toSource = function toSource() {
                return source.toSource();
            };
        } else {
            delete target.toSource;
        }

        target.toString = function toString() {
            return source.toString();
        };

        target.prototype = source.prototype;
        target.parse = source.parse;
        target.UTC = source.UTC;
        target.prototype.toUTCString = source.prototype.toUTCString;
        return target;
    }

    var methods = ["Date", "setTimeout", "setInterval",
                   "clearTimeout", "clearInterval"];

    function restore() {
        var method;

        for (var i = 0, l = this.methods.length; i < l; i++) {
            method = this.methods[i];
            if (global[method].hadOwnProperty) {
                global[method] = this["_" + method];
            } else {
                delete global[method];
            }
        }

        // Prevent multiple executions which will completely remove these props
        this.methods = [];
    }

    function stubGlobal(method, clock) {
        clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(global, method);
        clock["_" + method] = global[method];

        if (method == "Date") {
            var date = mirrorDateProperties(clock[method], global[method]);
            global[method] = date;
        } else {
            global[method] = function () {
                return clock[method].apply(clock, arguments);
            };

            for (var prop in clock[method]) {
                if (clock[method].hasOwnProperty(prop)) {
                    global[method][prop] = clock[method][prop];
                }
            }
        }

        global[method].clock = clock;
    }

    sinon.useFakeTimers = function useFakeTimers(now) {
        var clock = sinon.clock.create(now);
        clock.restore = restore;
        clock.methods = Array.prototype.slice.call(arguments,
                                                   typeof now == "number" ? 1 : 0);

        if (clock.methods.length === 0) {
            clock.methods = methods;
        }

        for (var i = 0, l = clock.methods.length; i < l; i++) {
            stubGlobal(clock.methods[i], clock);
        }

        return clock;
    };
}(typeof global != "undefined" && typeof global !== "function" ? global : this));

sinon.timers = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date
};

if (typeof module == "object" && typeof require == "function") {
    module.exports = sinon;
}

},{}],66:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};if (typeof buster === "undefined") {
    var buster = {};
}

if (typeof module === "object" && typeof require === "function") {
    buster = require("buster-core");
}

buster.format = buster.format || {};
buster.format.excludeConstructors = ["Object", /^.$/];
buster.format.quoteStrings = true;

buster.format.ascii = (function () {
    "use strict";

    var hasOwn = Object.prototype.hasOwnProperty;

    var specialObjects = [];
    if (typeof global != "undefined") {
        specialObjects.push({ obj: global, value: "[object global]" });
    }
    if (typeof document != "undefined") {
        specialObjects.push({ obj: document, value: "[object HTMLDocument]" });
    }
    if (typeof window != "undefined") {
        specialObjects.push({ obj: window, value: "[object Window]" });
    }

    function keys(object) {
        var k = Object.keys && Object.keys(object) || [];

        if (k.length == 0) {
            for (var prop in object) {
                if (hasOwn.call(object, prop)) {
                    k.push(prop);
                }
            }
        }

        return k.sort();
    }

    function isCircular(object, objects) {
        if (typeof object != "object") {
            return false;
        }

        for (var i = 0, l = objects.length; i < l; ++i) {
            if (objects[i] === object) {
                return true;
            }
        }

        return false;
    }

    function ascii(object, processed, indent) {
        if (typeof object == "string") {
            var quote = typeof this.quoteStrings != "boolean" || this.quoteStrings;
            return processed || quote ? '"' + object + '"' : object;
        }

        if (typeof object == "function" && !(object instanceof RegExp)) {
            return ascii.func(object);
        }

        processed = processed || [];

        if (isCircular(object, processed)) {
            return "[Circular]";
        }

        if (Object.prototype.toString.call(object) == "[object Array]") {
            return ascii.array.call(this, object, processed);
        }

        if (!object) {
            return "" + object;
        }

        if (buster.isElement(object)) {
            return ascii.element(object);
        }

        if (typeof object.toString == "function" &&
            object.toString !== Object.prototype.toString) {
            return object.toString();
        }

        for (var i = 0, l = specialObjects.length; i < l; i++) {
            if (object === specialObjects[i].obj) {
                return specialObjects[i].value;
            }
        }

        return ascii.object.call(this, object, processed, indent);
    }

    ascii.func = function (func) {
        return "function " + buster.functionName(func) + "() {}";
    };

    ascii.array = function (array, processed) {
        processed = processed || [];
        processed.push(array);
        var pieces = [];

        for (var i = 0, l = array.length; i < l; ++i) {
            pieces.push(ascii.call(this, array[i], processed));
        }

        return "[" + pieces.join(", ") + "]";
    };

    ascii.object = function (object, processed, indent) {
        processed = processed || [];
        processed.push(object);
        indent = indent || 0;
        var pieces = [], properties = keys(object), prop, str, obj;
        var is = "";
        var length = 3;

        for (var i = 0, l = indent; i < l; ++i) {
            is += " ";
        }

        for (i = 0, l = properties.length; i < l; ++i) {
            prop = properties[i];
            obj = object[prop];

            if (isCircular(obj, processed)) {
                str = "[Circular]";
            } else {
                str = ascii.call(this, obj, processed, indent + 2);
            }

            str = (/\s/.test(prop) ? '"' + prop + '"' : prop) + ": " + str;
            length += str.length;
            pieces.push(str);
        }

        var cons = ascii.constructorName.call(this, object);
        var prefix = cons ? "[" + cons + "] " : ""

        return (length + indent) > 80 ?
            prefix + "{\n  " + is + pieces.join(",\n  " + is) + "\n" + is + "}" :
            prefix + "{ " + pieces.join(", ") + " }";
    };

    ascii.element = function (element) {
        var tagName = element.tagName.toLowerCase();
        var attrs = element.attributes, attribute, pairs = [], attrName;

        for (var i = 0, l = attrs.length; i < l; ++i) {
            attribute = attrs.item(i);
            attrName = attribute.nodeName.toLowerCase().replace("html:", "");

            if (attrName == "contenteditable" && attribute.nodeValue == "inherit") {
                continue;
            }

            if (!!attribute.nodeValue) {
                pairs.push(attrName + "=\"" + attribute.nodeValue + "\"");
            }
        }

        var formatted = "<" + tagName + (pairs.length > 0 ? " " : "");
        var content = element.innerHTML;

        if (content.length > 20) {
            content = content.substr(0, 20) + "[...]";
        }

        var res = formatted + pairs.join(" ") + ">" + content + "</" + tagName + ">";

        return res.replace(/ contentEditable="inherit"/, "");
    };

    ascii.constructorName = function (object) {
        var name = buster.functionName(object && object.constructor);
        var excludes = this.excludeConstructors || buster.format.excludeConstructors || [];

        for (var i = 0, l = excludes.length; i < l; ++i) {
            if (typeof excludes[i] == "string" && excludes[i] == name) {
                return "";
            } else if (excludes[i].test && excludes[i].test(name)) {
                return "";
            }
        }

        return name;
    };

    return ascii;
}());

if (typeof module != "undefined") {
    module.exports = buster.format;
}

},{"buster-core":67}],67:[function(require,module,exports){
var process=require("__browserify_process");var buster = (function (setTimeout, B) {
    var isNode = typeof require == "function" && typeof module == "object";
    var div = typeof document != "undefined" && document.createElement("div");
    var F = function () {};

    var buster = {
        bind: function bind(obj, methOrProp) {
            var method = typeof methOrProp == "string" ? obj[methOrProp] : methOrProp;
            var args = Array.prototype.slice.call(arguments, 2);
            return function () {
                var allArgs = args.concat(Array.prototype.slice.call(arguments));
                return method.apply(obj, allArgs);
            };
        },

        partial: function partial(fn) {
            var args = [].slice.call(arguments, 1);
            return function () {
                return fn.apply(this, args.concat([].slice.call(arguments)));
            };
        },

        create: function create(object) {
            F.prototype = object;
            return new F();
        },

        extend: function extend(target) {
            if (!target) { return; }
            for (var i = 1, l = arguments.length, prop; i < l; ++i) {
                for (prop in arguments[i]) {
                    target[prop] = arguments[i][prop];
                }
            }
            return target;
        },

        nextTick: function nextTick(callback) {
            if (typeof process != "undefined" && process.nextTick) {
                return process.nextTick(callback);
            }
            setTimeout(callback, 0);
        },

        functionName: function functionName(func) {
            if (!func) return "";
            if (func.displayName) return func.displayName;
            if (func.name) return func.name;
            var matches = func.toString().match(/function\s+([^\(]+)/m);
            return matches && matches[1] || "";
        },

        isNode: function isNode(obj) {
            if (!div) return false;
            try {
                obj.appendChild(div);
                obj.removeChild(div);
            } catch (e) {
                return false;
            }
            return true;
        },

        isElement: function isElement(obj) {
            return obj && obj.nodeType === 1 && buster.isNode(obj);
        },

        isArray: function isArray(arr) {
            return Object.prototype.toString.call(arr) == "[object Array]";
        },

        flatten: function flatten(arr) {
            var result = [], arr = arr || [];
            for (var i = 0, l = arr.length; i < l; ++i) {
                result = result.concat(buster.isArray(arr[i]) ? flatten(arr[i]) : arr[i]);
            }
            return result;
        },

        each: function each(arr, callback) {
            for (var i = 0, l = arr.length; i < l; ++i) {
                callback(arr[i]);
            }
        },

        map: function map(arr, callback) {
            var results = [];
            for (var i = 0, l = arr.length; i < l; ++i) {
                results.push(callback(arr[i]));
            }
            return results;
        },

        parallel: function parallel(fns, callback) {
            function cb(err, res) {
                if (typeof callback == "function") {
                    callback(err, res);
                    callback = null;
                }
            }
            if (fns.length == 0) { return cb(null, []); }
            var remaining = fns.length, results = [];
            function makeDone(num) {
                return function done(err, result) {
                    if (err) { return cb(err); }
                    results[num] = result;
                    if (--remaining == 0) { cb(null, results); }
                };
            }
            for (var i = 0, l = fns.length; i < l; ++i) {
                fns[i](makeDone(i));
            }
        },

        series: function series(fns, callback) {
            function cb(err, res) {
                if (typeof callback == "function") {
                    callback(err, res);
                }
            }
            var remaining = fns.slice();
            var results = [];
            function callNext() {
                if (remaining.length == 0) return cb(null, results);
                var promise = remaining.shift()(next);
                if (promise && typeof promise.then == "function") {
                    promise.then(buster.partial(next, null), next);
                }
            }
            function next(err, result) {
                if (err) return cb(err);
                results.push(result);
                callNext();
            }
            callNext();
        },

        countdown: function countdown(num, done) {
            return function () {
                if (--num == 0) done();
            };
        }
    };

    if (typeof process === "object" &&
        typeof require === "function" && typeof module === "object") {
        var crypto = require("crypto");
        var path = require("path");

        buster.tmpFile = function (fileName) {
            var hashed = crypto.createHash("sha1");
            hashed.update(fileName);
            var tmpfileName = hashed.digest("hex");

            if (process.platform == "win32") {
                return path.join(process.env["TEMP"], tmpfileName);
            } else {
                return path.join("/tmp", tmpfileName);
            }
        };
    }

    if (Array.prototype.some) {
        buster.some = function (arr, fn, thisp) {
            return arr.some(fn, thisp);
        };
    } else {
        // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
        buster.some = function (arr, fun, thisp) {
            "use strict";
            if (arr == null) { throw new TypeError(); }
            arr = Object(arr);
            var len = arr.length >>> 0;
            if (typeof fun !== "function") { throw new TypeError(); }

            for (var i = 0; i < len; i++) {
                if (arr.hasOwnProperty(i) && fun.call(thisp, arr[i], i, arr)) {
                    return true;
                }
            }

            return false;
        };
    }

    if (Array.prototype.filter) {
        buster.filter = function (arr, fn, thisp) {
            return arr.filter(fn, thisp);
        };
    } else {
        // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/filter
        buster.filter = function (fn, thisp) {
            "use strict";
            if (this == null) { throw new TypeError(); }

            var t = Object(this);
            var len = t.length >>> 0;
            if (typeof fn != "function") { throw new TypeError(); }

            var res = [];
            for (var i = 0; i < len; i++) {
                if (i in t) {
                    var val = t[i]; // in case fun mutates this
                    if (fn.call(thisp, val, i, t)) { res.push(val); }
                }
            }

            return res;
        };
    }

    if (isNode) {
        module.exports = buster;
        buster.eventEmitter = require("./buster-event-emitter");
        Object.defineProperty(buster, "defineVersionGetter", {
            get: function () {
                return require("./define-version-getter");
            }
        });
    }

    return buster.extend(B || {}, buster);
}(setTimeout, buster));

},{"./buster-event-emitter":68,"./define-version-getter":69,"__browserify_process":16,"crypto":11,"path":5}],68:[function(require,module,exports){
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global buster, require, module*/
if (typeof require == "function" && typeof module == "object") {
    var buster = require("./buster-core");
}

(function () {
    function eventListeners(eventEmitter, event) {
        if (!eventEmitter.listeners) {
            eventEmitter.listeners = {};
        }

        if (!eventEmitter.listeners[event]) {
            eventEmitter.listeners[event] = [];
        }

        return eventEmitter.listeners[event];
    }

    function throwLater(event, error) {
        buster.nextTick(function () {
            error.message = event + " listener threw error: " + error.message;
            throw error;
        });
    }

    function addSupervisor(emitter, listener, thisObject) {
        if (!emitter.supervisors) { emitter.supervisors = []; }
        emitter.supervisors.push({
            listener: listener,
            thisObject: thisObject
        });
    }

    function notifyListener(emitter, event, listener, args) {
        try {
            listener.listener.apply(listener.thisObject || emitter, args);
        } catch (e) {
            throwLater(event, e);
        }
    }

    buster.eventEmitter = {
        create: function () {
            return buster.create(this);
        },

        addListener: function addListener(event, listener, thisObject) {
            if (typeof event === "function") {
                return addSupervisor(this, event, listener);
            }
            if (typeof listener != "function") {
                throw new TypeError("Listener is not function");
            }
            eventListeners(this, event).push({
                listener: listener,
                thisObject: thisObject
            });
        },

        once: function once(event, listener, thisObject) {
            var self = this;
            this.addListener(event, listener);

            var wrapped = function () {
                self.removeListener(event, listener);
                self.removeListener(event, wrapped);
            };
            this.addListener(event, wrapped);
        },

        hasListener: function hasListener(event, listener, thisObject) {
            var listeners = eventListeners(this, event);

            for (var i = 0, l = listeners.length; i < l; i++) {
                if (listeners[i].listener === listener &&
                    listeners[i].thisObject === thisObject) {
                    return true;
                }
            }

            return false;
        },

        removeListener: function (event, listener) {
            var listeners = eventListeners(this, event);

            for (var i = 0, l = listeners.length; i < l; ++i) {
                if (listeners[i].listener == listener) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        },

        emit: function emit(event) {
            var listeners = eventListeners(this, event).slice();
            var args = Array.prototype.slice.call(arguments, 1);

            for (var i = 0, l = listeners.length; i < l; i++) {
                notifyListener(this, event, listeners[i], args);
            }

            listeners = this.supervisors || [];
            args = Array.prototype.slice.call(arguments);
            for (i = 0, l = listeners.length; i < l; ++i) {
                notifyListener(this, event, listeners[i], args);
            }
        },

        bind: function (object, events) {
            var method;

            if (!events) {
                for (method in object) {
                    if (object.hasOwnProperty(method) && typeof object[method] == "function") {
                        this.addListener(method, object[method], object);
                    }
                }
            } else if (typeof events == "string" ||
                       Object.prototype.toString.call(events) == "[object Array]") {
                events = typeof events == "string" ? [events] : events;

                for (var i = 0, l = events.length; i < l; ++i) {
                    this.addListener(events[i], object[events[i]], object);
                }
            } else {
                for (var prop in events) {
                    if (events.hasOwnProperty(prop)) {
                        method = events[prop];

                        if (typeof method == "function") {
                            object[buster.functionName(method) || prop] = method;
                        } else {
                            method = object[events[prop]];
                        }

                        this.addListener(prop, method, object);
                    }
                }
            }

            return object;
        }
    };

    buster.eventEmitter.on = buster.eventEmitter.addListener;
}());

if (typeof module != "undefined") {
    module.exports = buster.eventEmitter;
}

},{"./buster-core":67}],69:[function(require,module,exports){
var path = require("path");
var fs = require("fs");

module.exports = function defineVersionGetter(mod, dirname) {
    Object.defineProperty(mod, "VERSION", {
        get: function () {
            if (!this.version) {
                var pkgJSON = path.resolve(dirname, "..", "package.json");
                var pkg = JSON.parse(fs.readFileSync(pkgJSON, "utf8"));
                this.version = pkg.version;
            }

            return this.version;
        }
    });
};

},{"fs":4,"path":5}],70:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;

var adapter = global.adapter;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("2.1.2.1: When fulfilled, a promise: must not transition to any other state.", function () {
    testFulfilled(dummy, function (promise, done) {
        var onFulfilledCalled = false;

        promise.then(function onFulfilled() {
            onFulfilledCalled = true;
        }, function onRejected() {
            assert.strictEqual(onFulfilledCalled, false);
            done();
        });

        setTimeout(function(){done();}, 100);
    });

    specify("trying to fulfill then immediately reject", function (done) {
        var tuple = pending();
        var onFulfilledCalled = false;

        tuple.promise.then(function onFulfilled() {
            onFulfilledCalled = true;
        }, function onRejected() {
            assert.strictEqual(onFulfilledCalled, false);
            done();
        });

        tuple.fulfill(dummy);
        tuple.reject(dummy);
        setTimeout(function(){done();}, 100);
    });

    specify("trying to fulfill then reject, delayed", function (done) {
        var tuple = pending();
        var onFulfilledCalled = false;

        tuple.promise.then(function onFulfilled() {
            onFulfilledCalled = true;
        }, function onRejected() {
            assert.strictEqual(onFulfilledCalled, false);
            done();
        });

        setTimeout(function () {
            tuple.fulfill(dummy);
            tuple.reject(dummy);
        }, 50);
        setTimeout(function(){done();}, 100);
    });

    specify("trying to fulfill immediately then reject delayed", function (done) {
        var tuple = pending();
        var onFulfilledCalled = false;

        tuple.promise.then(function onFulfilled() {
            onFulfilledCalled = true;
        }, function onRejected() {
            assert.strictEqual(onFulfilledCalled, false);
            done();
        });

        tuple.fulfill(dummy);
        setTimeout(function () {
            tuple.reject(dummy);
        }, 50);
        setTimeout(function(){done();}, 100);
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],71:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testRejected = require("./helpers/testThreeCases").testRejected;

var adapter = global.adapter;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("2.1.3.1: When rejected, a promise: must not transition to any other state.", function () {
    testRejected(dummy, function (promise, done) {
        var onRejectedCalled = false;

        promise.then(function onFulfilled() {
            assert.strictEqual(onRejectedCalled, false);
            done();
        }, function onRejected() {
            onRejectedCalled = true;
        });

        setTimeout(function(){done();}, 100);
    });

    specify("trying to reject then immediately fulfill", function (done) {
        var tuple = pending();
        var onRejectedCalled = false;

        tuple.promise.then(function onFulfilled() {
            assert.strictEqual(onRejectedCalled, false);
            done();
        }, function onRejected() {
            onRejectedCalled = true;
        });

        tuple.reject(dummy);
        tuple.fulfill(dummy);
        setTimeout(function(){done();}, 100);
    });

    specify("trying to reject then fulfill, delayed", function (done) {
        var tuple = pending();
        var onRejectedCalled = false;

        tuple.promise.then(function onFulfilled() {
            assert.strictEqual(onRejectedCalled, false);
            done();
        }, function onRejected() {
            onRejectedCalled = true;
        });

        setTimeout(function () {
            tuple.reject(dummy);
            tuple.fulfill(dummy);
        }, 50);
        setTimeout(function(){done();}, 100);
    });

    specify("trying to reject immediately then fulfill delayed", function (done) {
        var tuple = pending();
        var onRejectedCalled = false;

        tuple.promise.then(function onFulfilled() {
            assert.strictEqual(onRejectedCalled, false);
            done();
        }, function onRejected() {
            onRejectedCalled = true;
        });

        tuple.reject(dummy);
        setTimeout(function () {
            tuple.fulfill(dummy);
        }, 50);
        setTimeout(function(){done();}, 100);
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],72:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("2.2.1: Both `onFulfilled` and `onRejected` are optional arguments.", function () {
    describe("2.2.1.1: If `onFulfilled` is not a function, it must be ignored.", function () {
        function testNonFunction(nonFunction, stringRepresentation) {
            specify("`onFulfilled` is " + stringRepresentation, function (done) {
                rejected(dummy).then(nonFunction, function () {
                    done();
                });
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
    });

    describe("2.2.1.2: If `onRejected` is not a function, it must be ignored.", function () {
        function testNonFunction(nonFunction, stringRepresentation) {
            specify("`onRejected` is " + stringRepresentation, function (done) {
                fulfilled(dummy).then(function () {
                    done();
                }, nonFunction);
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
    });
});

},{}],73:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality

describe("2.2.2: If `onFulfilled` is a function,", function () {
    describe("2.2.2.1: it must be called after `promise` is fulfilled, with `promise`’s fulfillment value as its " +
             "first argument.", function () {
        testFulfilled(sentinel, function (promise, done) {
            promise.then(function onFulfilled(value) {
                assert.strictEqual(value, sentinel);
                done();
            });
        });
    });

    describe("2.2.2.2: it must not be called before `promise` is fulfilled", function () {
        specify("fulfilled after a delay", function (done) {
            var tuple = pending();
            var isFulfilled = false;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(isFulfilled, true);
                done();
            });

            setTimeout(function () {
                tuple.fulfill(dummy);
                isFulfilled = true;
            }, 50);
        });

        specify("never fulfilled", function (done) {
            var tuple = pending();
            var onFulfilledCalled = false;

            tuple.promise.then(function onFulfilled() {
                onFulfilledCalled = true;
                done();
            });

            setTimeout(function () {
                assert.strictEqual(onFulfilledCalled, false);
                done();
            }, 150);
        });
    });

    describe("2.2.2.3: it must not be called more than once.", function () {
        specify("already-fulfilled", function (done) {
            var timesCalled = 0;

            fulfilled(dummy).then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });
        });

        specify("trying to fulfill a pending promise more than once, immediately", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.fulfill(dummy);
            tuple.fulfill(dummy);
        });

        specify("trying to fulfill a pending promise more than once, delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            setTimeout(function () {
                tuple.fulfill(dummy);
                tuple.fulfill(dummy);
            }, 50);
        });

        specify("trying to fulfill a pending promise more than once, immediately then delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.fulfill(dummy);
            setTimeout(function () {
                tuple.fulfill(dummy);
            }, 50);
        });

        specify("when multiple `then` calls are made, spaced apart in time", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0, 0];

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            setTimeout(function () {
                tuple.promise.then(function onFulfilled() {
                    assert.strictEqual(++timesCalled[1], 1);
                });
            }, 50);

            setTimeout(function () {
                tuple.promise.then(function onFulfilled() {
                    assert.strictEqual(++timesCalled[2], 1);
                    done();
                });
            }, 100);

            setTimeout(function () {
                tuple.fulfill(dummy);
            }, 150);
        });

        specify("when `then` is interleaved with fulfillment", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0];

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            tuple.fulfill(dummy);

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled[1], 1);
                done();
            });
        });
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],74:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testRejected = require("./helpers/testThreeCases").testRejected;

var adapter = global.adapter;
var rejected = adapter.rejected;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality

describe("2.2.3: If `onRejected` is a function,", function () {
    describe("2.2.3.1: it must be called after `promise` is rejected, with `promise`’s rejection reason as its " +
             "first argument.", function () {
        testRejected(sentinel, function (promise, done) {
            promise.then(null, function onRejected(reason) {
                assert.strictEqual(reason, sentinel);
                done();
            });
        });
    });

    describe("2.2.3.2: it must not be called before `promise` is rejected", function () {
        specify("rejected after a delay", function (done) {
            var tuple = pending();
            var isRejected = false;

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(isRejected, true);
                done();
            });

            setTimeout(function () {
                tuple.reject(dummy);
                isRejected = true;
            }, 50);
        });

        specify("never rejected", function (done) {
            var tuple = pending();
            var onRejectedCalled = false;

            tuple.promise.then(null, function onRejected() {
                onRejectedCalled = true;
                done();
            });

            setTimeout(function () {
                assert.strictEqual(onRejectedCalled, false);
                done();
            }, 150);
        });
    });

    describe("2.2.3.3: it must not be called more than once.", function () {
        specify("already-rejected", function (done) {
            var timesCalled = 0;

            rejected(dummy).then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });
        });

        specify("trying to reject a pending promise more than once, immediately", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.reject(dummy);
            tuple.reject(dummy);
        });

        specify("trying to reject a pending promise more than once, delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            setTimeout(function () {
                tuple.reject(dummy);
                tuple.reject(dummy);
            }, 50);
        });

        specify("trying to reject a pending promise more than once, immediately then delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.reject(dummy);
            setTimeout(function () {
                tuple.reject(dummy);
            }, 50);
        });

        specify("when multiple `then` calls are made, spaced apart in time", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0, 0];

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            setTimeout(function () {
                tuple.promise.then(null, function onRejected() {
                    assert.strictEqual(++timesCalled[1], 1);
                });
            }, 50);

            setTimeout(function () {
                tuple.promise.then(null, function onRejected() {
                    assert.strictEqual(++timesCalled[2], 1);
                    done();
                });
            }, 100);

            setTimeout(function () {
                tuple.reject(dummy);
            }, 150);
        });

        specify("when `then` is interleaved with rejection", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0];

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            tuple.reject(dummy);

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled[1], 1);
                done();
            });
        });
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],75:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("2.2.4: `onFulfilled` or `onRejected` must not be called until the execution context stack contains only " +
         "platform code.", function () {
    describe("`then` returns before the promise becomes fulfilled or rejected", function () {
        testFulfilled(dummy, function (promise, done) {
            var thenHasReturned = false;

            promise.then(function onFulfilled() {
                assert.strictEqual(thenHasReturned, true);
                done();
            });

            thenHasReturned = true;
        });
        testRejected(dummy, function (promise, done) {
            var thenHasReturned = false;

            promise.then(null, function onRejected() {
                assert.strictEqual(thenHasReturned, true);
                done();
            });

            thenHasReturned = true;
        });
    });

    describe("Clean-stack execution ordering tests (fulfillment case)", function () {
        specify("when `onFulfilled` is added immediately before the promise is fulfilled",
                function () {
            var tuple = pending();
            var onFulfilledCalled = false;

            tuple.promise.then(function onFulfilled() {
                onFulfilledCalled = true;
            });

            tuple.fulfill(dummy);

            assert.strictEqual(onFulfilledCalled, false);
        });

        specify("when `onFulfilled` is added immediately after the promise is fulfilled",
                function () {
            var tuple = pending();
            var onFulfilledCalled = false;

            tuple.fulfill(dummy);

            tuple.promise.then(function onFulfilled() {
                onFulfilledCalled = true;
            });

            assert.strictEqual(onFulfilledCalled, false);
        });

        specify("when one `onFulfilled` is added inside another `onFulfilled`", function (done) {
            var promise = fulfilled();
            var firstOnFulfilledFinished = false;

            promise.then(function () {
                promise.then(function () {
                    assert.strictEqual(firstOnFulfilledFinished, true);
                    done();
                });
                firstOnFulfilledFinished = true;
            });
        });

        specify("when `onFulfilled` is added inside an `onRejected`", function (done) {
            var promise = rejected();
            var promise2 = fulfilled();
            var firstOnRejectedFinished = false;

            promise.then(null, function () {
                promise2.then(function () {
                    assert.strictEqual(firstOnRejectedFinished, true);
                    done();
                });
                firstOnRejectedFinished = true;
            });
        });

        specify("when the promise is fulfilled asynchronously", function (done) {
            var tuple = pending();
            var firstStackFinished = false;

            setTimeout(function () {
                tuple.fulfill(dummy);
                firstStackFinished = true;
            }, 0);

            tuple.promise.then(function () {
                assert.strictEqual(firstStackFinished, true);
                done();
            });
        });
    });

    describe("Clean-stack execution ordering tests (rejection case)", function () {
        specify("when `onRejected` is added immediately before the promise is rejected",
                function () {
            var tuple = pending();
            var onRejectedCalled = false;

            tuple.promise.then(null, function onRejected() {
                onRejectedCalled = true;
            });

            tuple.reject(dummy);

            assert.strictEqual(onRejectedCalled, false);
        });

        specify("when `onRejected` is added immediately after the promise is rejected",
                function () {
            var tuple = pending();
            var onRejectedCalled = false;

            tuple.reject(dummy);

            tuple.promise.then(null, function onRejected() {
                onRejectedCalled = true;
            });

            assert.strictEqual(onRejectedCalled, false);
        });

        specify("when `onRejected` is added inside an `onFulfilled`", function (done) {
            var promise = fulfilled();
            var promise2 = rejected();
            var firstOnFulfilledFinished = false;

            promise.then(function () {
                promise2.then(null, function () {
                    assert.strictEqual(firstOnFulfilledFinished, true);
                    done();
                });
                firstOnFulfilledFinished = true;
            });
        });

        specify("when one `onRejected` is added inside another `onRejected`", function (done) {
            var promise = rejected();
            var firstOnRejectedFinished = false;

            promise.then(null, function () {
                promise.then(null, function () {
                    assert.strictEqual(firstOnRejectedFinished, true);
                    done();
                });
                firstOnRejectedFinished = true;
            });
        });

        specify("when the promise is rejected asynchronously", function (done) {
            var tuple = pending();
            var firstStackFinished = false;

            setTimeout(function () {
                tuple.reject(dummy);
                firstStackFinished = true;
            }, 0);

            tuple.promise.then(null, function () {
                assert.strictEqual(firstStackFinished, true);
                done();
            });
        });
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],76:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/*jshint strict: false */

var assert = require("assert");

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

var undefinedThisStrict = (function() {
    "use strict";
    return this;
})();

var undefinedThisSloppy = (function() {
    return this;
})();

describe("2.2.5 `onFulfilled` and `onRejected` must be called as functions (i.e. with no `this` value).", function () {
    describe("strict mode", function () {
        specify("fulfilled", function (done) {
            fulfilled(dummy).then(function onFulfilled() {
                "use strict";

                assert(this === undefinedThisStrict ||
                       this === undefinedThisSloppy);
                done();
            });
        });

        specify("rejected", function (done) {
            rejected(dummy).then(null, function onRejected() {
                "use strict";

                assert(this === undefinedThisStrict ||
                       this === undefinedThisSloppy);
                done();
            });
        });
    });

    describe("sloppy mode", function () {
        specify("fulfilled", function (done) {
            fulfilled(dummy).then(function onFulfilled() {
                assert.strictEqual(this, undefinedThisSloppy);
                done();
            });
        });

        specify("rejected", function (done) {
            rejected(dummy).then(null, function onRejected() {
                assert.strictEqual(this, undefinedThisSloppy);
                done();
            });
        });
    });
});

},{"assert":2}],77:[function(require,module,exports){
"use strict";

var assert = require("assert");
var sinon = require("sinon");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var other = { other: "other" }; // a value we don't want to be strict equal to
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var sentinel2 = { sentinel2: "sentinel2" };
var sentinel3 = { sentinel3: "sentinel3" };

function callbackAggregator(times, ultimateCallback) {
    var soFar = 0;
    return function () {
        if (++soFar === times) {
            ultimateCallback();
        }
    };
}

describe("2.2.6: `then` may be called multiple times on the same promise.", function () {
    describe("2.2.6.1: If/when `promise` is fulfilled, all respective `onFulfilled` callbacks must execute in the " +
             "order of their originating calls to `then`.", function () {
        describe("multiple boring fulfillment handlers", function () {
            testFulfilled(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().returns(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(handler1, spy);
                promise.then(handler2, spy);
                promise.then(handler3, spy);

                promise.then(function (value) {
                    assert.strictEqual(value, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("multiple fulfillment handlers, one of which throws", function () {
            testFulfilled(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().throws(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(handler1, spy);
                promise.then(handler2, spy).caught(function(){});
                promise.then(handler3, spy);

                promise.then(function (value) {
                    assert.strictEqual(value, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("results in multiple branching chains with their own fulfillment values", function () {
            testFulfilled(dummy, function (promise, done) {
                var semiDone = callbackAggregator(3, done);

                promise.then(function () {
                    return sentinel;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel);
                    semiDone();
                });

                promise.then(function () {
                    throw sentinel2;
                }).then(null, function (reason) {
                    assert.strictEqual(reason, sentinel2);
                    semiDone();
                });

                promise.then(function () {
                    return sentinel3;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel3);
                    semiDone();
                });
            });
        });

        describe("`onFulfilled` handlers are called in the original order", function () {
            testFulfilled(dummy, function (promise, done) {
                var handler1 = sinon.spy(function handler1() {});
                var handler2 = sinon.spy(function handler2() {});
                var handler3 = sinon.spy(function handler3() {});

                promise.then(handler1);
                promise.then(handler2);
                promise.then(handler3);

                promise.then(function () {
                    sinon.assert.callOrder(handler1, handler2, handler3);
                    done();
                });
            });

            describe("even when one handler is added inside another handler", function () {
                testFulfilled(dummy, function (promise, done) {
                    var handler1 = sinon.spy(function handler1() {});
                    var handler2 = sinon.spy(function handler2() {});
                    var handler3 = sinon.spy(function handler3() {});

                    promise.then(function () {
                        handler1();
                        promise.then(handler3);
                    });
                    promise.then(handler2);

                    promise.then(function () {
                        // Give implementations a bit of extra time to flush their internal queue, if necessary.
                        setTimeout(function () {
                            sinon.assert.callOrder(handler1, handler2, handler3);
                            done();
                        }, 15);
                    });
                });
            });
        });
    });

    describe("2.2.6.2: If/when `promise` is rejected, all respective `onRejected` callbacks must execute in the " +
             "order of their originating calls to `then`.", function () {
        describe("multiple boring rejection handlers", function () {
            testRejected(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().returns(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(spy, handler1);
                promise.then(spy, handler2);
                promise.then(spy, handler3);

                promise.then(null, function (reason) {
                    assert.strictEqual(reason, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("multiple rejection handlers, one of which throws", function () {
            testRejected(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().throws(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(spy, handler1);
                promise.then(spy, handler2).caught(function(){});
                promise.then(spy, handler3);

                promise.then(null, function (reason) {
                    assert.strictEqual(reason, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("results in multiple branching chains with their own fulfillment values", function () {
            testRejected(sentinel, function (promise, done) {
                var semiDone = callbackAggregator(3, done);

                promise.then(null, function () {
                    return sentinel;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel);
                    semiDone();
                });

                promise.then(null, function () {
                    throw sentinel2;
                }).then(null, function (reason) {
                    assert.strictEqual(reason, sentinel2);
                    semiDone();
                });

                promise.then(null, function () {
                    return sentinel3;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel3);
                    semiDone();
                });
            });
        });

        describe("`onRejected` handlers are called in the original order", function () {
            testRejected(dummy, function (promise, done) {
                var handler1 = sinon.spy(function handler1() {});
                var handler2 = sinon.spy(function handler2() {});
                var handler3 = sinon.spy(function handler3() {});

                promise.then(null, handler1);
                promise.then(null, handler2);
                promise.then(null, handler3);

                promise.then(null, function () {
                    sinon.assert.callOrder(handler1, handler2, handler3);
                    done();
                });
            });

            describe("even when one handler is added inside another handler", function () {
                testRejected(dummy, function (promise, done) {
                    var handler1 = sinon.spy(function handler1() {});
                    var handler2 = sinon.spy(function handler2() {});
                    var handler3 = sinon.spy(function handler3() {});

                    promise.then(null, function () {
                        handler1();
                        promise.then(null, handler3);
                    });
                    promise.then(null, handler2);

                    promise.then(null, function () {
                        // Give implementations a bit of extra time to flush their internal queue, if necessary.
                        setTimeout(function () {
                            sinon.assert.callOrder(handler1, handler2, handler3);
                            done();
                        }, 15);
                    });
                });
            });
        });
    });
});

},{"./helpers/testThreeCases":109,"assert":2,"sinon":55}],78:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;
var reasons = require("./helpers/reasons");

var adapter = global.adapter;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var other = { other: "other" }; // a value we don't want to be strict equal to

describe("2.2.7: `then` must return a promise: `promise2 = promise1.then(onFulfilled, onRejected)`", function () {
    specify("is a promise", function () {
        var promise1 = pending().promise;
        var promise2 = promise1.then();

        assert(typeof promise2 === "object" || typeof promise2 === "function");
        assert.notStrictEqual(promise2, null);
        assert.strictEqual(typeof promise2.then, "function");
    });

    describe("2.2.7.1: If either `onFulfilled` or `onRejected` returns a value `x`, run the Promise Resolution " +
             "Procedure `[[Resolve]](promise2, x)`", function () {
        specify("see separate 3.3 tests", function () { });
    });

    describe("2.2.7.2: If either `onFulfilled` or `onRejected` throws an exception `e`, `promise2` must be rejected " +
             "with `e` as the reason.", function () {
        function testReason(expectedReason, stringRepresentation) {
            describe("The reason is " + stringRepresentation, function () {
                testFulfilled(dummy, function (promise1, done) {
                    var promise2 = promise1.then(function onFulfilled() {
                        throw expectedReason;
                    });

                    promise2.then(null, function onPromise2Rejected(actualReason) {
                        assert.strictEqual(actualReason, expectedReason);
                        done();
                    });
                });
                testRejected(dummy, function (promise1, done) {
                    var promise2 = promise1.then(null, function onRejected() {
                        throw expectedReason;
                    });

                    promise2.then(null, function onPromise2Rejected(actualReason) {
                        assert.strictEqual(actualReason, expectedReason);
                        done();
                    });
                });
            });
        }

        Object.keys(reasons).forEach(function (stringRepresentation) {
            testReason(reasons[stringRepresentation], stringRepresentation);
        });
    });

    describe("2.2.7.3: If `onFulfilled` is not a function and `promise1` is fulfilled, `promise2` must be fulfilled " +
             "with the same value.", function () {

        function testNonFunction(nonFunction, stringRepresentation) {
            describe("`onFulfilled` is " + stringRepresentation, function () {
                testFulfilled(sentinel, function (promise1, done) {
                    var promise2 = promise1.then(nonFunction);

                    promise2.then(function onPromise2Fulfilled(value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
        testNonFunction([function () { return other; }], "an array containing a function");
    });

    describe("2.2.7.4: If `onRejected` is not a function and `promise1` is rejected, `promise2` must be rejected " +
             "with the same reason.", function () {

        function testNonFunction(nonFunction, stringRepresentation) {
            describe("`onRejected` is " + stringRepresentation, function () {
                testRejected(sentinel, function (promise1, done) {
                    var promise2 = promise1.then(null, nonFunction);

                    promise2.then(null, function onPromise2Rejected(reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
        testNonFunction([function () { return other; }], "an array containing a function");
    });
});

},{"./helpers/reasons":108,"./helpers/testThreeCases":109,"assert":2}],79:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("2.3.1: If `promise` and `x` refer to the same object, reject `promise` with a `TypeError' as the reason.",
         function () {
    specify("via return from a fulfilled promise", function (done) {
        var promise = fulfilled(dummy).then(function () {
            return promise;
        });

        promise.then(null, function (reason) {
            assert(reason instanceof adapter.TypeError);
            done();
        });
    });

    specify("via return from a rejected promise", function (done) {
        var promise = rejected(dummy).then(null, function () {
            return promise;
        });

        promise.then(null, function (reason) {
            assert(reason instanceof adapter.TypeError);
            done();
        });
    });
});

},{"assert":2}],80:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality

function testPromiseResolution(xFactory, test) {
    specify("via return from a fulfilled promise", function (done) {
        var promise = fulfilled(dummy).then(function onBasePromiseFulfilled() {
            return xFactory();
        });

        test(promise, done);
    });

    specify("via return from a rejected promise", function (done) {
        var promise = rejected(dummy).then(null, function onBasePromiseRejected() {
            return xFactory();
        });

        test(promise, done);
    });
}

describe("2.3.2: If `x` is a promise, adopt its state", function () {
    describe("2.3.2.1: If `x` is pending, `promise` must remain pending until `x` is fulfilled or rejected.",
             function () {
        function xFactory() {
            return pending().promise;
        }

        testPromiseResolution(xFactory, function (promise, done) {
            var wasFulfilled = false;
            var wasRejected = false;

            promise.then(
                function onPromiseFulfilled() {
                    wasFulfilled = true;
                },
                function onPromiseRejected() {
                    wasRejected = true;
                }
            );

            setTimeout(function () {
                assert.strictEqual(wasFulfilled, false);
                assert.strictEqual(wasRejected, false);
                done();
            }, 100);
        });
    });

    describe("2.3.2.2: If/when `x` is fulfilled, fulfill `promise` with the same value.", function () {
        describe("`x` is already-fulfilled", function () {
            function xFactory() {
                return fulfilled(sentinel);
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(function onPromiseFulfilled(value) {
                    assert.strictEqual(value, sentinel);
                    done();
                });
            });
        });

        describe("`x` is eventually-fulfilled", function () {
            var tuple = null;

            function xFactory() {
                tuple = pending();
                setTimeout(function () {
                    tuple.fulfill(sentinel);
                }, 50);
                return tuple.promise;
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(function onPromiseFulfilled(value) {
                    assert.strictEqual(value, sentinel);
                    done();
                });
            });
        });
    });

    describe("2.3.2.3: If/when `x` is rejected, reject `promise` with the same reason.", function () {
        describe("`x` is already-rejected", function () {
            function xFactory() {
                return rejected(sentinel);
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(null, function onPromiseRejected(reason) {
                    assert.strictEqual(reason, sentinel);
                    done();
                });
            });
        });

        describe("`x` is eventually-rejected", function () {
            var tuple = null;

            function xFactory() {
                tuple = pending();
                setTimeout(function () {
                    tuple.reject(sentinel);
                }, 50);
                return tuple.promise;
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(null, function onPromiseRejected(reason) {
                    assert.strictEqual(reason, sentinel);
                    done();
                });
            });
        });
    });
});

},{"assert":2}],81:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var thenables = require("./helpers/thenables");
var reasons = require("./helpers/reasons");

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var other = { other: "other" }; // a value we don't want to be strict equal to
var sentinelArray = [sentinel]; // a sentinel fulfillment value to test when we need an array

function testPromiseResolution(xFactory, test) {
    specify("via return from a fulfilled promise", function (done) {
        var promise = fulfilled(dummy).then(function onBasePromiseFulfilled() {
            return xFactory();
        });

        test(promise, done);
    });

    specify("via return from a rejected promise", function (done) {
        var promise = rejected(dummy).then(null, function onBasePromiseRejected() {
            return xFactory();
        });

        test(promise, done);
    });
}

function testCallingResolvePromise(yFactory, stringRepresentation, test) {
    describe("`y` is " + stringRepresentation, function () {
        describe("`then` calls `resolvePromise` synchronously", function () {
            function xFactory() {
                return {
                    then: function (resolvePromise) {
                        resolvePromise(yFactory());
                    }
                };
            }

            testPromiseResolution(xFactory, test);
        });

        describe("`then` calls `resolvePromise` asynchronously", function () {
            function xFactory() {
                return {
                    then: function (resolvePromise) {
                        setTimeout(function () {
                            resolvePromise(yFactory());
                        }, 0);
                    }
                };
            }

            testPromiseResolution(xFactory, test);
        });
    });
}

function testCallingRejectPromise(r, stringRepresentation, test) {
    describe("`r` is " + stringRepresentation, function () {
        describe("`then` calls `rejectPromise` synchronously", function () {
            function xFactory() {
                return {
                    then: function (resolvePromise, rejectPromise) {
                        rejectPromise(r);
                    }
                };
            }

            testPromiseResolution(xFactory, test);
        });

        describe("`then` calls `rejectPromise` asynchronously", function () {
            function xFactory() {
                return {
                    then: function (resolvePromise, rejectPromise) {
                        setTimeout(function () {
                            rejectPromise(r);
                        }, 0);
                    }
                };
            }

            testPromiseResolution(xFactory, test);
        });
    });
}

function testCallingResolvePromiseFulfillsWith(yFactory, stringRepresentation, fulfillmentValue) {
    testCallingResolvePromise(yFactory, stringRepresentation, function (promise, done) {

        promise.then(function onPromiseFulfilled(value) {
            assert.strictEqual(value, fulfillmentValue);
            done();
        });
    });
}

function testCallingResolvePromiseRejectsWith(yFactory, stringRepresentation, rejectionReason) {
    testCallingResolvePromise(yFactory, stringRepresentation, function (promise, done) {

        promise.then(null, function onPromiseRejected(reason) {
            assert.strictEqual(reason, rejectionReason);
            done();
        });
    });
}

function testCallingRejectPromiseRejectsWith(reason, stringRepresentation) {
    testCallingRejectPromise(reason, stringRepresentation, function (promise, done) {

        promise.then(null, function onPromiseRejected(rejectionReason) {
            assert.strictEqual(rejectionReason, reason);
            done();
        });
    });
}

describe("2.3.3: Otherwise, if `x` is an object or function,", function () {
    describe("2.3.3.1: Let `then` be `x.then`", function () {
        describe("`x` is an object with null prototype", function () {
            var numberOfTimesThenWasRetrieved = null;

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0;
            });

            function xFactory() {
                return Object.create(null, {
                    then: {
                        get: function () {
                            ++numberOfTimesThenWasRetrieved;
                            return function thenMethodForX(onFulfilled) {
                                onFulfilled();
                            };
                        }
                    }
                });
            }

            testPromiseResolution(xFactory, function (promise, done) {

                promise.then(function () {
                    assert.strictEqual(numberOfTimesThenWasRetrieved, 1);
                    done();
                });
            });
        });

        describe("`x` is an object with normal Object.prototype", function () {
            var numberOfTimesThenWasRetrieved = null;

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0;
            });

            function xFactory() {
                return Object.create(Object.prototype, {
                    then: {
                        get: function () {
                            ++numberOfTimesThenWasRetrieved;
                            return function thenMethodForX(onFulfilled) {
                                onFulfilled();
                            };
                        }
                    }
                });
            }

            testPromiseResolution(xFactory, function (promise, done) {

                promise.then(function () {
                    assert.strictEqual(numberOfTimesThenWasRetrieved, 1);
                    done();
                });
            });
        });

        describe("`x` is a function", function () {
            var numberOfTimesThenWasRetrieved = null;

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0;
            });

            function xFactory() {
                function x() { }

                Object.defineProperty(x, "then", {
                    get: function () {
                        ++numberOfTimesThenWasRetrieved;
                        return function thenMethodForX(onFulfilled) {
                            onFulfilled();
                        };
                    }
                });

                return x;
            }

            testPromiseResolution(xFactory, function (promise, done) {

                promise.then(function () {
                    assert.strictEqual(numberOfTimesThenWasRetrieved, 1);
                    done();
                });
            });
        });
    });

    describe("2.3.3.2: If retrieving the property `x.then` results in a thrown exception `e`, reject `promise` with " +
             "`e` as the reason.", function () {
        function testRejectionViaThrowingGetter(e, stringRepresentation) {
            function xFactory() {
                return Object.create(Object.prototype, {
                    then: {
                        get: function () {
                            throw e;
                        }
                    }
                });
            }

            describe("`e` is " + stringRepresentation, function () {
                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, e);
                        done();
                    });
                });
            });
        }

        Object.keys(reasons).forEach(function (stringRepresentation) {
            testRejectionViaThrowingGetter(reasons[stringRepresentation], stringRepresentation);
        });
    });

    describe("2.3.3.3: If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and " +
             "second argument `rejectPromise`", function () {
        describe("Calls with `x` as `this` and two function arguments", function () {
            function xFactory() {
                var x = {
                    then: function (onFulfilled, onRejected) {
                        assert.strictEqual(this, x);
                        assert.strictEqual(typeof onFulfilled, "function");
                        assert.strictEqual(typeof onRejected, "function");
                        onFulfilled();
                    }
                };
                return x;
            }

            testPromiseResolution(xFactory, function (promise, done) {

                promise.then(function () {
                    done();
                });
            });
        });

        describe("Uses the original value of `then`", function () {
            var numberOfTimesThenWasRetrieved = null;

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0;
            });

            function xFactory() {
                return Object.create(Object.prototype, {
                    then: {
                        get: function () {
                            if (numberOfTimesThenWasRetrieved === 0) {
                                return function (onFulfilled) {
                                    onFulfilled();
                                };
                            }
                            return null;
                        }
                    }
                });
            }

            testPromiseResolution(xFactory, function (promise, done) {

                promise.then(function () {
                    done();
                });
            });
        });

        describe("2.3.3.3.1: If/when `resolvePromise` is called with value `y`, run `[[Resolve]](promise, y)`",
                 function () {
            describe("`y` is not a thenable", function () {
                testCallingResolvePromiseFulfillsWith(function () { return undefined; }, "`undefined`", undefined);
                testCallingResolvePromiseFulfillsWith(function () { return null; }, "`null`", null);
                testCallingResolvePromiseFulfillsWith(function () { return false; }, "`false`", false);
                testCallingResolvePromiseFulfillsWith(function () { return 5; }, "`5`", 5);
                testCallingResolvePromiseFulfillsWith(function () { return sentinel; }, "an object", sentinel);
                testCallingResolvePromiseFulfillsWith(function () { return sentinelArray; }, "an array", sentinelArray);
            });

            describe("`y` is a thenable", function () {
                Object.keys(thenables.fulfilled).forEach(function (stringRepresentation) {
                    function yFactory() {
                        return thenables.fulfilled[stringRepresentation](sentinel);
                    }

                    testCallingResolvePromiseFulfillsWith(yFactory, stringRepresentation, sentinel);
                });

                Object.keys(thenables.rejected).forEach(function (stringRepresentation) {
                    function yFactory() {
                        return thenables.rejected[stringRepresentation](sentinel);
                    }

                    testCallingResolvePromiseRejectsWith(yFactory, stringRepresentation, sentinel);
                });
            });

            describe("`y` is a thenable for a thenable", function () {
                Object.keys(thenables.fulfilled).forEach(function (outerStringRepresentation) {
                    var outerThenableFactory = thenables.fulfilled[outerStringRepresentation];

                    Object.keys(thenables.fulfilled).forEach(function (innerStringRepresentation) {
                        var innerThenableFactory = thenables.fulfilled[innerStringRepresentation];

                        var stringRepresentation = outerStringRepresentation + " for " + innerStringRepresentation;

                        function yFactory() {
                            return outerThenableFactory(innerThenableFactory(sentinel));
                        }

                        testCallingResolvePromiseFulfillsWith(yFactory, stringRepresentation, sentinel);
                    });

                    Object.keys(thenables.rejected).forEach(function (innerStringRepresentation) {
                        var innerThenableFactory = thenables.rejected[innerStringRepresentation];

                        var stringRepresentation = outerStringRepresentation + " for " + innerStringRepresentation;

                        function yFactory() {
                            return outerThenableFactory(innerThenableFactory(sentinel));
                        }

                        testCallingResolvePromiseRejectsWith(yFactory, stringRepresentation, sentinel);
                    });
                });
            });
        });

        describe("2.3.3.3.2: If/when `rejectPromise` is called with reason `r`, reject `promise` with `r`",
                 function () {
            Object.keys(reasons).forEach(function (stringRepresentation) {
                testCallingRejectPromiseRejectsWith(reasons[stringRepresentation], stringRepresentation);
            });
        });

        describe("2.3.3.3.3: If both `resolvePromise` and `rejectPromise` are called, or multiple calls to the same " +
                 "argument are made, the first call takes precedence, and any further calls are ignored.",
                 function () {
            describe("calling `resolvePromise` then `rejectPromise`, both synchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            resolvePromise(sentinel);
                            rejectPromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` synchronously then `rejectPromise` asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            resolvePromise(sentinel);

                            setTimeout(function () {
                                rejectPromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` then `rejectPromise`, both asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            setTimeout(function () {
                                resolvePromise(sentinel);
                            }, 0);

                            setTimeout(function () {
                                rejectPromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` with an asynchronously-fulfilled promise, then calling " +
                     "`rejectPromise`, both synchronously", function () {
                function xFactory() {
                    var tuple = pending();
                    setTimeout(function () {
                        tuple.fulfill(sentinel);
                    }, 50);

                    return {
                        then: function (resolvePromise, rejectPromise) {
                            resolvePromise(tuple.promise);
                            rejectPromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` with an asynchronously-rejected promise, then calling " +
                     "`rejectPromise`, both synchronously", function () {
                function xFactory() {
                    var tuple = pending();
                    setTimeout(function () {
                        tuple.reject(sentinel);
                    }, 50);

                    return {
                        then: function (resolvePromise, rejectPromise) {
                            resolvePromise(tuple.promise);
                            rejectPromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {
                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("calling `rejectPromise` then `resolvePromise`, both synchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            rejectPromise(sentinel);
                            resolvePromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("calling `rejectPromise` synchronously then `resolvePromise` asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            rejectPromise(sentinel);

                            setTimeout(function () {
                                resolvePromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("calling `rejectPromise` then `resolvePromise`, both asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            setTimeout(function () {
                                rejectPromise(sentinel);
                            }, 0);

                            setTimeout(function () {
                                resolvePromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` twice synchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise) {
                            resolvePromise(sentinel);
                            resolvePromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` twice, first synchronously then asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise) {
                            resolvePromise(sentinel);

                            setTimeout(function () {
                                resolvePromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` twice, both times asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise) {
                            setTimeout(function () {
                                resolvePromise(sentinel);
                            }, 0);

                            setTimeout(function () {
                                resolvePromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` with an asynchronously-fulfilled promise, then calling it again, both " +
                     "times synchronously", function () {
                function xFactory() {
                    var tuple = pending();
                    setTimeout(function () {
                        tuple.fulfill(sentinel);
                    }, 50);

                    return {
                        then: function (resolvePromise) {
                            resolvePromise(tuple.promise);
                            resolvePromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(function (value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });

            describe("calling `resolvePromise` with an asynchronously-rejected promise, then calling it again, both " +
                     "times synchronously", function () {
                function xFactory() {
                    var tuple = pending();
                    setTimeout(function () {
                        tuple.reject(sentinel);
                    }, 50);

                    return {
                        then: function (resolvePromise) {
                            resolvePromise(tuple.promise);
                            resolvePromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {

                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("calling `rejectPromise` twice synchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            rejectPromise(sentinel);
                            rejectPromise(other);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {
                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("calling `rejectPromise` twice, first synchronously then asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            rejectPromise(sentinel);

                            setTimeout(function () {
                                resolvePromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {
                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("calling `rejectPromise` twice, both times asynchronously", function () {
                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            setTimeout(function () {
                                rejectPromise(sentinel);
                            }, 0);

                            setTimeout(function () {
                                resolvePromise(other);
                            }, 0);
                        }
                    };
                }

                testPromiseResolution(xFactory, function (promise, done) {
                    promise.then(null, function (reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });

            describe("saving and abusing `resolvePromise` and `rejectPromise`", function () {
                var savedResolvePromise, savedRejectPromise;

                function xFactory() {
                    return {
                        then: function (resolvePromise, rejectPromise) {
                            savedResolvePromise = resolvePromise;
                            savedRejectPromise = rejectPromise;
                        }
                    };
                }

                beforeEach(function () {
                    savedResolvePromise = null;
                    savedRejectPromise = null;
                });

                testPromiseResolution(xFactory, function (promise, done) {
                    var timesFulfilled = 0;
                    var timesRejected = 0;

                    promise.then(
                        function () {
                            ++timesFulfilled;
                        },
                        function () {
                            ++timesRejected;
                        }
                    );

                    if (savedResolvePromise && savedRejectPromise) {
                        savedResolvePromise(dummy);
                        savedResolvePromise(dummy);
                        savedRejectPromise(dummy);
                        savedRejectPromise(dummy);
                    }

                    setTimeout(function () {
                        savedResolvePromise(dummy);
                        savedResolvePromise(dummy);
                        savedRejectPromise(dummy);
                        savedRejectPromise(dummy);
                    }, 4);

                    setTimeout(function () {
                        assert.strictEqual(timesFulfilled, 1);
                        assert.strictEqual(timesRejected, 0);
                        done();
                    }, 60);
                });
            });
        });

        describe("2.3.3.3.4: If calling `then` throws an exception `e`,", function () {
            describe("2.3.3.3.4.1: If `resolvePromise` or `rejectPromise` have been called, ignore it.", function () {
                describe("`resolvePromise` was called with a non-thenable", function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise) {
                                resolvePromise(sentinel);
                                throw other;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel);
                            done();
                        });
                    });
                });

                describe("`resolvePromise` was called with an asynchronously-fulfilled promise", function () {
                    function xFactory() {
                        var tuple = pending();
                        setTimeout(function () {
                            tuple.fulfill(sentinel);
                        }, 50);

                        return {
                            then: function (resolvePromise) {
                                resolvePromise(tuple.promise);
                                throw other;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel);
                            done();
                        });
                    });
                });

                describe("`resolvePromise` was called with an asynchronously-rejected promise", function () {
                    function xFactory() {
                        var tuple = pending();
                        setTimeout(function () {
                            tuple.reject(sentinel);
                        }, 50);

                        return {
                            then: function (resolvePromise) {
                                resolvePromise(tuple.promise);
                                throw other;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel);
                            done();
                        });
                    });
                });

                describe("`rejectPromise` was called", function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel);
                                throw other;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel);
                            done();
                        });
                    });
                });

                describe("`resolvePromise` then `rejectPromise` were called", function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                resolvePromise(sentinel);
                                rejectPromise(other);
                                throw other;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel);
                            done();
                        });
                    });
                });

                describe("`rejectPromise` then `resolvePromise` were called", function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel);
                                resolvePromise(other);
                                throw other;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel);
                            done();
                        });
                    });
                });
            });

            describe("2.3.3.3.4.2: Otherwise, reject `promise` with `e` as the reason.", function () {
                describe("straightforward case", function () {
                    function xFactory() {
                        return {
                            then: function () {
                                throw sentinel;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel);
                            done();
                        });
                    });
                });

                describe("`resolvePromise` is called asynchronously before the `throw`", function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise) {
                                setTimeout(function () {
                                    resolvePromise(other);
                                }, 0);
                                throw sentinel;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel);
                            done();
                        });
                    });
                });

                describe("`rejectPromise` is called asynchronously before the `throw`", function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                setTimeout(function () {
                                    rejectPromise(other);
                                }, 0);
                                throw sentinel;
                            }
                        };
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe("2.3.3.4: If `then` is not a function, fulfill promise with `x`", function () {
        function testFulfillViaNonFunction(then, stringRepresentation) {
            var x = null;

            beforeEach(function () {
                x = { then: then };
            });

            function xFactory() {
                return x;
            }

            describe("`then` is " + stringRepresentation, function () {
                testPromiseResolution(xFactory, function (promise, done) {
                    promise.then(function (value) {
                        assert.strictEqual(value, x);
                        done();
                    });
                });
            });
        }

        testFulfillViaNonFunction(5, "`5`");
        testFulfillViaNonFunction({}, "an object");
        testFulfillViaNonFunction([function () { }], "an array containing a function");
        testFulfillViaNonFunction(/a-b/i, "a regular expression");
        testFulfillViaNonFunction(Object.create(Function.prototype), "an object inheriting from `Function.prototype`");



    });
});

},{"./helpers/reasons":108,"./helpers/thenables":110,"assert":2}],82:[function(require,module,exports){
"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("2.3.4: If `x` is not an object or function, fulfill `promise` with `x`", function () {
    function testValue(expectedValue, stringRepresentation, beforeEachHook, afterEachHook) {
        describe("The value is " + stringRepresentation, function () {
            if (typeof beforeEachHook === "function") {
                beforeEach(beforeEachHook);
            }
            if (typeof afterEachHook === "function") {
                afterEach(afterEachHook);
            }

            testFulfilled(dummy, function (promise1, done) {
                var promise2 = promise1.then(function onFulfilled() {
                    return expectedValue;
                });

                promise2.then(function onPromise2Fulfilled(actualValue) {
                    assert.strictEqual(actualValue, expectedValue);
                    done();
                });
            });
            testRejected(dummy, function (promise1, done) {
                var promise2 = promise1.then(null, function onRejected() {
                    return expectedValue;
                });

                promise2.then(function onPromise2Fulfilled(actualValue) {
                    assert.strictEqual(actualValue, expectedValue);
                    done();
                });
            });
        });
    }

    testValue(undefined, "`undefined`");
    testValue(null, "`null`");
    testValue(false, "`false`");
    testValue(true, "`true`");
    testValue(0, "`0`");

    testValue(
        true,
        "`true` with `Boolean.prototype` modified to have a `then` method",
        function () {
            Boolean.prototype.then = function () {};
        },
        function () {
            delete Boolean.prototype.then;
        }
    );

    testValue(
        1,
        "`1` with `Number.prototype` modified to have a `then` method",
        function () {
            Number.prototype.then = function () {};
        },
        function () {
            delete Number.prototype.then;
        }
    );
});

},{"./helpers/testThreeCases":109,"assert":2}],83:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("3.2.1: Both `onFulfilled` and `onRejected` are optional arguments.", function () {
    describe("3.2.1.1: If `onFulfilled` is not a function, it must be ignored.", function () {
        function testNonFunction(nonFunction, stringRepresentation) {
            specify("`onFulfilled` is " + stringRepresentation, function (done) {
                rejected(dummy).then(nonFunction, function () {
                    done();
                });
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
    });

    describe("3.2.1.2: If `onRejected` is not a function, it must be ignored.", function () {
        function testNonFunction(nonFunction, stringRepresentation) {
            specify("`onRejected` is " + stringRepresentation, function (done) {
                fulfilled(dummy).then(function () {
                    done();
                }, nonFunction);
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
    });
});

},{}],84:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality

describe("3.2.2: If `onFulfilled` is a function,", function () {
    describe("3.2.2.1: it must be called after `promise` is fulfilled, with `promise`’s fulfillment value as its " +
             "first argument.", function () {
        testFulfilled(sentinel, function (promise, done) {
            promise.then(function onFulfilled(value) {
                assert.strictEqual(value, sentinel);
                done();
            });
        });
    });

    describe("3.2.2.2: it must not be called more than once.", function () {
        specify("already-fulfilled", function (done) {
            var timesCalled = 0;

            fulfilled(dummy).then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });
        });

        specify("trying to fulfill a pending promise more than once, immediately", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.fulfill(dummy);
            tuple.fulfill(dummy);
        });

        specify("trying to fulfill a pending promise more than once, delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            setTimeout(function () {
                tuple.fulfill(dummy);
                tuple.fulfill(dummy);
            }, 50);
        });

        specify("trying to fulfill a pending promise more than once, immediately then delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.fulfill(dummy);
            setTimeout(function () {
                tuple.fulfill(dummy);
            }, 50);
        });

        specify("when multiple `then` calls are made, spaced apart in time", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0, 0];

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            setTimeout(function () {
                tuple.promise.then(function onFulfilled() {
                    assert.strictEqual(++timesCalled[1], 1);
                });
            }, 50);

            setTimeout(function () {
                tuple.promise.then(function onFulfilled() {
                    assert.strictEqual(++timesCalled[2], 1);
                    done();
                });
            }, 100);

            setTimeout(function () {
                tuple.fulfill(dummy);
            }, 150);
        });

        specify("when `then` is interleaved with fulfillment", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0];

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            tuple.fulfill(dummy);

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(++timesCalled[1], 1);
                done();
            });
        });
    });

    describe("3.2.2.3: it must not be called if `onRejected` has been called.", function () {
        testRejected(dummy, function (promise, done) {
            var onRejectedCalled = false;

            promise.then(function onFulfilled() {
                assert.strictEqual(onRejectedCalled, false);
                done();
            }, function onRejected() {
                onRejectedCalled = true;
            });

            setTimeout(function(){done();}, 100);
        });

        specify("trying to reject then immediately fulfill", function (done) {
            var tuple = pending();
            var onRejectedCalled = false;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(onRejectedCalled, false);
                done();
            }, function onRejected() {
                onRejectedCalled = true;
            });

            tuple.reject(dummy);
            tuple.fulfill(dummy);
            setTimeout(function(){done();}, 100);
        });

        specify("trying to reject then fulfill, delayed", function (done) {
            var tuple = pending();
            var onRejectedCalled = false;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(onRejectedCalled, false);
                done();
            }, function onRejected() {
                onRejectedCalled = true;
            });

            setTimeout(function () {
                tuple.reject(dummy);
                tuple.fulfill(dummy);
            }, 50);
            setTimeout(function(){done();}, 100);
        });

        specify("trying to reject immediately then fulfill delayed", function (done) {
            var tuple = pending();
            var onRejectedCalled = false;

            tuple.promise.then(function onFulfilled() {
                assert.strictEqual(onRejectedCalled, false);
                done();
            }, function onRejected() {
                onRejectedCalled = true;
            });

            tuple.reject(dummy);
            setTimeout(function () {
                tuple.fulfill(dummy);
            }, 50);
            setTimeout(function(){done();}, 100);
        });
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],85:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var adapter = global.adapter;
var rejected = adapter.rejected;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality

describe("3.2.3: If `onRejected` is a function,", function () {
    describe("3.2.3.1: it must be called after `promise` is rejected, with `promise`’s rejection reason as its " +
             "first argument.", function () {
        testRejected(sentinel, function (promise, done) {
            promise.then(null, function onRejected(reason) {
                assert.strictEqual(reason, sentinel);
                done();
            });
        });
    });

    describe("3.2.3.2: it must not be called more than once.", function () {
        specify("already-rejected", function (done) {
            var timesCalled = 0;

            rejected(dummy).then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });
        });

        specify("trying to reject a pending promise more than once, immediately", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.reject(dummy);
            tuple.reject(dummy);
        });

        specify("trying to reject a pending promise more than once, delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            setTimeout(function () {
                tuple.reject(dummy);
                tuple.reject(dummy);
            }, 50);
        });

        specify("trying to reject a pending promise more than once, immediately then delayed", function (done) {
            var tuple = pending();
            var timesCalled = 0;

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled, 1);
                done();
            });

            tuple.reject(dummy);
            setTimeout(function () {
                tuple.reject(dummy);
            }, 50);
        });

        specify("when multiple `then` calls are made, spaced apart in time", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0, 0];

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            setTimeout(function () {
                tuple.promise.then(null, function onRejected() {
                    assert.strictEqual(++timesCalled[1], 1);
                });
            }, 50);

            setTimeout(function () {
                tuple.promise.then(null, function onRejected() {
                    assert.strictEqual(++timesCalled[2], 1);
                    done();
                });
            }, 100);

            setTimeout(function () {
                tuple.reject(dummy);
            }, 150);
        });

        specify("when `then` is interleaved with rejection", function (done) {
            var tuple = pending();
            var timesCalled = [0, 0];

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled[0], 1);
            });

            tuple.reject(dummy);

            tuple.promise.then(null, function onRejected() {
                assert.strictEqual(++timesCalled[1], 1);
                done();
            });
        });
    });

    describe("3.2.3.3: it must not be called if `onFulfilled` has been called.", function () {
        testFulfilled(dummy, function (promise, done) {
            var onFulfilledCalled = false;

            promise.then(function onFulfilled() {
                onFulfilledCalled = true;
            }, function onRejected() {
                assert.strictEqual(onFulfilledCalled, false);
                done();
            });

            setTimeout(function(){done();}, 100);
        });

        specify("trying to fulfill then immediately reject", function (done) {
            var tuple = pending();
            var onFulfilledCalled = false;

            tuple.promise.then(function onFulfilled() {
                onFulfilledCalled = true;
            }, function onRejected() {
                assert.strictEqual(onFulfilledCalled, false);
                done();
            });

            tuple.fulfill(dummy);
            tuple.reject(dummy);
            setTimeout(function(){done();}, 100);
        });

        specify("trying to fulfill then reject, delayed", function (done) {
            var tuple = pending();
            var onFulfilledCalled = false;

            tuple.promise.then(function onFulfilled() {
                onFulfilledCalled = true;
            }, function onRejected() {
                assert.strictEqual(onFulfilledCalled, false);
                done();
            });

            setTimeout(function () {
                tuple.fulfill(dummy);
                tuple.reject(dummy);
            }, 50);
            setTimeout(function(){done();}, 100);
        });

        specify("trying to fulfill immediately then reject delayed", function (done) {
            var tuple = pending();
            var onFulfilledCalled = false;

            tuple.promise.then(function onFulfilled() {
                onFulfilledCalled = true;
            }, function onRejected() {
                assert.strictEqual(onFulfilledCalled, false);
                done();
            });

            tuple.fulfill(dummy);
            setTimeout(function () {
                tuple.reject(dummy);
            }, 50);
            setTimeout(function(){done();}, 100);
        });
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],86:[function(require,module,exports){
"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it

describe("3.2.4: `then` must return before `onFulfilled` or `onRejected` is called", function () {
    testFulfilled(dummy, function (promise, done) {
        var thenHasReturned = false;

        promise.then(function onFulfilled() {
            assert(thenHasReturned);
            done();
        });

        thenHasReturned = true;
    });

    testRejected(dummy, function (promise, done) {
        var thenHasReturned = false;

        promise.then(null, function onRejected() {
            assert(thenHasReturned);
            done();
        });

        thenHasReturned = true;
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],87:[function(require,module,exports){
"use strict";

var assert = require("assert");
var sinon = require("sinon");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var other = { other: "other" }; // a value we don't want to be strict equal to
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var sentinel2 = { sentinel2: "sentinel2" };
var sentinel3 = { sentinel3: "sentinel3" };

function callbackAggregator(times, ultimateCallback) {
    var soFar = 0;
    return function () {
        if (++soFar === times) {
            ultimateCallback();
        }
    };
}

describe("3.2.5: `then` may be called multiple times on the same promise.", function () {
    describe("3.2.5.1: If/when `promise` is fulfilled, respective `onFulfilled` callbacks must execute in the order " +
             "of their originating calls to `then`.", function () {
        describe("multiple boring fulfillment handlers", function () {
            testFulfilled(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().returns(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(handler1, spy);
                promise.then(handler2, spy);
                promise.then(handler3, spy);

                promise.then(function (value) {
                    assert.strictEqual(value, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("multiple fulfillment handlers, one of which throws", function () {
            testFulfilled(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().throws(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(handler1, spy);
                promise.then(handler2, spy).caught(function(){});
                promise.then(handler3, spy);

                promise.then(function (value) {
                    assert.strictEqual(value, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("results in multiple branching chains with their own fulfillment values", function () {
            testFulfilled(dummy, function (promise, done) {
                var semiDone = callbackAggregator(3, done);

                promise.then(function () {
                    return sentinel;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel);
                    semiDone();
                });

                promise.then(function () {
                    throw sentinel2;
                }).then(null, function (reason) {
                    assert.strictEqual(reason, sentinel2);
                    semiDone();
                });

                promise.then(function () {
                    return sentinel3;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel3);
                    semiDone();
                });
            });
        });

        describe("`onFulfilled` handlers are called in the original order", function () {
            testFulfilled(dummy, function (promise, done) {
                var handler1 = sinon.spy(function handler1() {});
                var handler2 = sinon.spy(function handler2() {});
                var handler3 = sinon.spy(function handler3() {});

                promise.then(handler1);
                promise.then(handler2);
                promise.then(handler3);

                promise.then(function () {
                    sinon.assert.callOrder(handler1, handler2, handler3);
                    done();
                });
            });

            describe("even when one handler is added inside another handler", function () {
                testFulfilled(dummy, function (promise, done) {
                    var handler1 = sinon.spy(function handler1() {});
                    var handler2 = sinon.spy(function handler2() {});
                    var handler3 = sinon.spy(function handler3() {});

                    promise.then(function () {
                        handler1();
                        promise.then(handler3);
                    });
                    promise.then(handler2);

                    promise.then(function () {
                        // Give implementations a bit of extra time to flush their internal queue, if necessary.
                        setTimeout(function () {
                            sinon.assert.callOrder(handler1, handler2, handler3);
                            done();
                        }, 15);
                    });
                });
            });
        });
    });

    describe("3.2.5.2: If/when `promise` is rejected, respective `onRejected` callbacks must execute in the order " +
             "of their originating calls to `then`.", function () {
        describe("multiple boring rejection handlers", function () {
            testRejected(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().returns(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(spy, handler1);
                promise.then(spy, handler2);
                promise.then(spy, handler3);

                promise.then(null, function (reason) {
                    assert.strictEqual(reason, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("multiple rejection handlers, one of which throws", function () {
            testRejected(sentinel, function (promise, done) {
                var handler1 = sinon.stub().returns(other);
                var handler2 = sinon.stub().throws(other);
                var handler3 = sinon.stub().returns(other);

                var spy = sinon.spy();
                promise.then(spy, handler1);
                promise.then(spy, handler2).caught(function(){});
                promise.then(spy, handler3);

                promise.then(null, function (reason) {
                    assert.strictEqual(reason, sentinel);

                    sinon.assert.calledWith(handler1, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler2, sinon.match.same(sentinel));
                    sinon.assert.calledWith(handler3, sinon.match.same(sentinel));
                    sinon.assert.notCalled(spy);

                    done();
                });
            });
        });

        describe("results in multiple branching chains with their own fulfillment values", function () {
            testRejected(sentinel, function (promise, done) {
                var semiDone = callbackAggregator(3, done);

                promise.then(null, function () {
                    return sentinel;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel);
                    semiDone();
                });

                promise.then(null, function () {
                    throw sentinel2;
                }).then(null, function (reason) {
                    assert.strictEqual(reason, sentinel2);
                    semiDone();
                });

                promise.then(null, function () {
                    return sentinel3;
                }).then(function (value) {
                    assert.strictEqual(value, sentinel3);
                    semiDone();
                });
            });
        });

        describe("`onRejected` handlers are called in the original order", function () {
            testRejected(dummy, function (promise, done) {
                var handler1 = sinon.spy(function handler1() {});
                var handler2 = sinon.spy(function handler2() {});
                var handler3 = sinon.spy(function handler3() {});

                promise.then(null, handler1);
                promise.then(null, handler2);
                promise.then(null, handler3);

                promise.then(null, function () {
                    sinon.assert.callOrder(handler1, handler2, handler3);
                    done();
                });
            });

            describe("even when one handler is added inside another handler", function () {
                testRejected(dummy, function (promise, done) {
                    var handler1 = sinon.spy(function handler1() {});
                    var handler2 = sinon.spy(function handler2() {});
                    var handler3 = sinon.spy(function handler3() {});

                    promise.then(null, function () {
                        handler1();
                        promise.then(null, handler3);
                    });
                    promise.then(null, handler2);

                    promise.then(null, function () {
                        // Give implementations a bit of extra time to flush their internal queue, if necessary.
                        setTimeout(function () {
                            sinon.assert.callOrder(handler1, handler2, handler3);
                            done();
                        }, 15);
                    });
                });
            });
        });
    });
});

},{"./helpers/testThreeCases":109,"assert":2,"sinon":55}],88:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var assert = require("assert");
var testFulfilled = require("./helpers/testThreeCases").testFulfilled;
var testRejected = require("./helpers/testThreeCases").testRejected;

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var other = { other: "other" }; // a value we don't want to be strict equal to

describe("3.2.6: `then` must return a promise: `promise2 = promise1.then(onFulfilled, onRejected)`", function () {
    specify("is a promise", function () {
        var promise1 = pending().promise;
        var promise2 = promise1.then();

        assert(typeof promise2 === "object" || typeof promise2 === "function");
        assert.notStrictEqual(promise2, null);
        assert.strictEqual(typeof promise2.then, "function");
    });

    describe("3.2.6.1: If either `onFulfilled` or `onRejected` returns a value that is not a promise, `promise2` " +
             "must be fulfilled with that value.", function () {
        function testValue(expectedValue, stringRepresentation) {
            describe("The value is " + stringRepresentation, function () {
                testFulfilled(dummy, function (promise1, done) {
                    var promise2 = promise1.then(function onFulfilled() {
                        return expectedValue;
                    });

                    promise2.then(function onPromise2Fulfilled(actualValue) {
                        assert.strictEqual(actualValue, expectedValue);
                        done();
                    });
                });
                testRejected(dummy, function (promise1, done) {
                    var promise2 = promise1.then(null, function onRejected() {
                        return expectedValue;
                    });

                    promise2.then(function onPromise2Fulfilled(actualValue) {
                        assert.strictEqual(actualValue, expectedValue);
                        done();
                    });
                });
            });
        }

        testValue(undefined, "`undefined`");
        testValue(null, "`null`");
        testValue(false, "`false`");
        testValue(0, "`0`");
        testValue(new Error(), "an error");
        testValue(new Date(), "a date");
        testValue({}, "an object");
        testValue({ then: 5 }, "an object with a non-function `then` property");
    });

    describe("3.2.6.2: If either `onFulfilled` or `onRejected` throws an exception, `promise2` " +
             "must be rejected with the thrown exception as the reason.", function () {
        function testReason(expectedReason, stringRepresentation) {
            describe("The reason is " + stringRepresentation, function () {
                testFulfilled(dummy, function (promise1, done) {
                    var promise2 = promise1.then(function onFulfilled() {
                        throw expectedReason;
                    });

                    promise2.then(null, function onPromise2Rejected(actualReason) {
                        assert.strictEqual(actualReason, expectedReason);
                        done();
                    });
                });
                testRejected(dummy, function (promise1, done) {
                    var promise2 = promise1.then(null, function onRejected() {
                        throw expectedReason;
                    });

                    promise2.then(null, function onPromise2Rejected(actualReason) {
                        assert.strictEqual(actualReason, expectedReason);
                        done();
                    });
                });
            });
        }

        testReason(undefined, "`undefined`");
        testReason(null, "`null`");
        testReason(false, "`false`");
        testReason(0, "`0`");
        testReason(new Error(), "an error");
        testReason(new Date(), "a date");
        testReason({}, "an object");
        testReason({ then: function () { } }, "a promise-alike");
        testReason(fulfilled(dummy), "a fulfilled promise");
        var promise = rejected(dummy); promise.caught(function(){});
        testReason(promise, "a rejected promise");
    });

    describe("3.2.6.3: If either `onFulfilled` or `onRejected` returns a promise (call it `returnedPromise`), " +
             "`promise2` must assume the state of `returnedPromise`", function () {
        describe("3.2.6.3.1: If `returnedPromise` is pending, `promise2` must remain pending until `returnedPromise` " +
                 "is fulfilled or rejected.", function () {
            testFulfilled(dummy, function (promise1, done) {
                var wasFulfilled = false;
                var wasRejected = false;

                var promise2 = promise1.then(function onFulfilled() {
                    var returnedPromise = pending().promise;
                    return returnedPromise;
                });

                promise2.then(
                    function onPromise2Fulfilled() {
                        wasFulfilled = true;
                    },
                    function onPromise2Rejected() {
                        wasRejected = true;
                    }
                );

                setTimeout(function () {
                    assert.strictEqual(wasFulfilled, false);
                    assert.strictEqual(wasRejected, false);
                    done();
                }, 100);
            });

            testRejected(dummy, function (promise1, done) {
                var wasFulfilled = false;
                var wasRejected = false;

                var promise2 = promise1.then(null, function onRejected() {
                    var returnedPromise = pending().promise;
                    return returnedPromise;
                });

                promise2.then(
                    function onPromise2Fulfilled() {
                        wasFulfilled = true;
                    },
                    function onPromise2Rejected() {
                        wasRejected = true;
                    }
                );

                setTimeout(function () {
                    assert.strictEqual(wasFulfilled, false);
                    assert.strictEqual(wasRejected, false);
                    done();
                }, 100);
            });
        });

        describe("3.2.6.3.2: If/when `returnedPromise` is fulfilled, `promise2` must be fulfilled with the same value.",
                 function () {
            describe("`promise1` is fulfilled, and `returnedPromise` is:", function () {
                testFulfilled(sentinel, function (returnedPromise, done) {
                    var promise1 = fulfilled(dummy);
                    var promise2 = promise1.then(function onFulfilled() {
                        return returnedPromise;
                    });

                    promise2.then(function onPromise2Fulfilled(value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });

                specify("a pseudo-promise", function (done) {
                    var promise1 = fulfilled(dummy);
                    var promise2 = promise1.then(function onFulfilled() {
                        return {
                            then: function (f) { f(sentinel); }
                        };
                    });

                    promise2.then(function onPromise2Fulfilled(value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });
            describe("`promise1` is rejected, and `returnedPromise` is:", function () {
                testFulfilled(sentinel, function (returnedPromise, done) {
                    var promise1 = rejected(dummy);
                    var promise2 = promise1.then(null, function onRejected() {
                        return returnedPromise;
                    });

                    promise2.then(function onPromise2Fulfilled(value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });

                specify("a pseudo-promise", function (done) {
                    var promise1 = rejected(dummy);
                    var promise2 = promise1.then(null, function onRejected() {
                        return {
                            then: function (f) { f(sentinel); }
                        };
                    });

                    promise2.then(function onPromise2Fulfilled(value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });
        });

        describe("3.2.6.3.3: If/when `returnedPromise` is rejected, `promise2` must be rejected with the same reason.",
                 function () {
            describe("`promise1` is fulfilled, and `returnedPromise` is:", function () {
                testRejected(sentinel, function (returnedPromise, done) {
                    var promise1 = fulfilled(dummy);
                    var promise2 = promise1.then(function onFulfilled() {
                        return returnedPromise;
                    });

                    promise2.then(null, function onPromise2Rejected(reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });

                specify("a pseudo-promise", function (done) {
                    var promise1 = fulfilled(dummy);
                    var promise2 = promise1.then(function onFulfilled() {
                        return {
                            then: function (f, r) { r(sentinel); }
                        };
                    });

                    promise2.then(null, function onPromise2Rejected(reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });
            describe("`promise1` is rejected, and `returnedPromise` is:", function () {
                testRejected(sentinel, function (returnedPromise, done) {
                    var promise1 = rejected(dummy);
                    var promise2 = promise1.then(null, function onRejected() {
                        return returnedPromise;
                    });

                    promise2.then(null, function onPromise2Rejected(reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });

                specify("a pseudo-promise", function (done) {
                    var promise1 = rejected(dummy);
                    var promise2 = promise1.then(null, function onRejected() {
                        return {
                            then: function (f, r) { r(sentinel); }
                        };
                    });

                    promise2.then(null, function onPromise2Rejected(reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });
        });
    });

    describe("3.2.6.4: If `onFulfilled` is not a function and `promise1` is fulfilled, `promise2` must be fulfilled " +
             "with the same value.", function () {

        function testNonFunction(nonFunction, stringRepresentation) {
            describe("`onFulfilled` is " + stringRepresentation, function () {
                testFulfilled(sentinel, function (promise1, done) {
                    var promise2 = promise1.then(nonFunction);

                    promise2.then(function onPromise2Fulfilled(value) {
                        assert.strictEqual(value, sentinel);
                        done();
                    });
                });
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
        testNonFunction([function () { return other; }], "an array containing a function");
    });

    describe("3.2.6.5: If `onRejected` is not a function and `promise1` is rejected, `promise2` must be rejected " +
             "with the same reason.", function () {

        function testNonFunction(nonFunction, stringRepresentation) {
            describe("`onRejected` is " + stringRepresentation, function () {
                testRejected(sentinel, function (promise1, done) {
                    var promise2 = promise1.then(null, nonFunction);

                    promise2.then(null, function onPromise2Rejected(reason) {
                        assert.strictEqual(reason, sentinel);
                        done();
                    });
                });
            });
        }

        testNonFunction(undefined, "`undefined`");
        testNonFunction(null, "`null`");
        testNonFunction(false, "`false`");
        testNonFunction(5, "`5`");
        testNonFunction({}, "an object");
        testNonFunction([function () { return other; }], "an array containing a function");
    });
});

},{"./helpers/testThreeCases":109,"assert":2}],89:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

function assertErrorHasLongTraces(e) {
    assert( e.stack.indexOf( "From previous event:" ) > -1 );
}

function testCollection(name, a1, a2, a3) {

    function getPromise(obj, val) {
        return obj === void 0
            ? Promise.resolve(val)[name](a1, a2, a3)
            : Promise[name](val, a1, a2, a3);
    }

    function thenable(obj) {
        var o = {
            then: function(f) {
                setTimeout(function(){
                    f(3);
                }, 13);
            }
        }
        specify("thenable for non-collection value", function(done) {
            getPromise(obj, o).then(function(){
                assert.fail();
            }).caught(Promise.TypeError, function(e) {
                done();
            });
        });
    };

    function immediate(obj) {
        specify("immediate for non-collection value", function(done){
            getPromise(obj, 3).then(function(){
                assert.fail();
            }).caught(Promise.TypeError, function(e) {
                done();
            });
        });
    }

    function promise(obj) {
        var d = Promise.defer();
        setTimeout(function(){
            d.resolve(3);
        }, 13);
        specify("promise for non-collection value", function(done) {

            getPromise(obj, d.promise).then(function(){
                assert.fail();
            }).caught(Promise.TypeError, function(e) {
                done();
            });
        });
    }

    describe("When passing non-collection argument to Promise."+name + "() it should reject", function() {
        immediate(Promise);
        thenable(Promise);
        promise(Promise);
    });

    describe("When calling ."+name + "() on a promise that resolves to a non-collection it should reject", function() {
        immediate();
        thenable();
        promise();
    });
}

if( Promise.hasLongStackTraces() ) {


    describe("runtime API misuse should result in rejections", function(){


        specify("returning promises circularly", function(done) {
            var d = Promise.pending();
            var p = d.promise;

            var c = p.then(function(){
                return c;
            });

            c.caught(function(e){
                assert( e instanceof Promise.TypeError );
                assertErrorHasLongTraces(e);
                done();
            });
            d.fulfill(3);
        });

        specify("using illegal catchfilter", function(done) {

            var d = Promise.pending();
            var p = d.promise;

            p.caught(null, function(){

            })

            p.caught(function(e){
                assert( e instanceof Promise.TypeError );
                assertErrorHasLongTraces(e);
                done();
            });

            d.fulfill(3);
        });

        specify( "non-function to map", function(done) {

            Promise.map([], []).caught(function(e){
                assert( e instanceof Promise.TypeError );
                done();
            });
        });


        specify( "non-function to map inside then", function(done) {

            Promise.fulfilled().then(function(){
                return Promise.map([], []);
            }).caught(function(e){
                assert( e instanceof Promise.TypeError );
                assertErrorHasLongTraces(e);
                done();
            });
        });


        specify( "non-function to reduce", function(done) {

            Promise.reduce([], []).caught(function(e){
                assert( e instanceof Promise.TypeError );
                done();
            });
        });


        specify( "non-function to reduce inside then", function(done) {

            Promise.fulfilled().then(function(){
                return Promise.reduce([], []);
            }).caught(function(e){
                assert( e instanceof Promise.TypeError );
                assertErrorHasLongTraces(e);
                done();
            });
        });


        specify( "non-integer to some", function(done) {

            Promise.some([], "asd").caught(function(e){
                assert( e instanceof Promise.TypeError );
                done();
            });
        });


        specify( "non-integer to some inside then", function(done) {

            Promise.fulfilled().then(function(){
                return Promise.some([], "asd")
            }).caught(function(e){
                assert( e instanceof Promise.TypeError );
                assertErrorHasLongTraces(e);
                done();
            });
        });

        specify( "non-array to all", function(done) {

            Promise.all("asd", "asd").caught(function(e){
                assert( e instanceof Promise.TypeError );
                done();
            });
        });


        specify( "non-array to all inside then", function(done) {

            Promise.fulfilled().then(function(){
                return Promise.all("asd", "asd");
            }).caught(function(e){
                assert( e instanceof Promise.TypeError );
                assertErrorHasLongTraces(e);
                done();
            });
        });

    });


    describe("static API misuse should just throw right away", function(){

        specify("non-function to promise constructor", function(done) {
            try {
                new Promise();
                assert.fail();
            }
            catch(e) {
                assert(e instanceof Promise.TypeError);
                done();
            }
        });

        specify( "non-function to coroutine", function(done) {
            try {
                Promise.coroutine();
                assert.fail();
            }
            catch( e ) {
                assert( e instanceof Promise.TypeError );
                done();
            }
        });


        specify( "non-object to promisifyAll", function(done) {
            try {
                Promise.promisifyAll();
                assert.fail();
            }
            catch( e ) {
                assert( e instanceof Promise.TypeError );
                done();
            }
        });


        specify( "non-function to promisify", function(done) {
            try {
                Promise.promisify();
                assert.fail();
            }
            catch( e ) {
                assert( e instanceof Promise.TypeError );
                done();
            }
        });

    });

    testCollection("race");
    testCollection("all");
    testCollection("settle");
    testCollection("any");
    testCollection("some", 1);
    testCollection("map", function(){});
    testCollection("reduce", function(){});
    testCollection("filter", function(){});
    testCollection("props", function(){});
}

},{"../../js/debug/bluebird.js":21,"assert":2}],90:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

describe("Async requirement", function() {

    var arr = [];

    function a() {
        arr.push(1);
    }

    function b() {
        arr.push(2);
    }

    function c() {
        arr.push(3);
    }


    function assertArr() {
        assert.deepEqual(arr, [1,2,3]);
        arr.length = 0;
    }


    specify("Basic", function(done) {
        var p = new Promise(function(resolve) {
            resolve();
        });
        a();
        p.then(c);
        b();
        p.then(assertArr).then(function(){
            done();
        }).done();
    });

    specify("Resolve-Before-Then", function(done) {
        var resolveP;
        var p = new Promise(function(resolve) {
            resolveP = resolve;
        });

        a();
        resolveP();
        p.then(c);
        b();
        p.then(assertArr).then(function(){
            done();
        }).done();
    });

    specify("Resolve-After-Then", function(done) {
        var resolveP;
        var p = new Promise(function(resolve) {
            resolveP = resolve;
        });

        a();
        p.then(c);
        resolveP();
        b();
        p.then(assertArr).then(function(){
            done();
        }).done();
    });

    specify("Then-Inside-Then", function(done) {
        var fulfilledP = Promise.fulfilled();
        fulfilledP.then(function() {
            a();
            fulfilledP.then(c).then(assertArr).then(function(){
                done();
            }).done();
            b();
        });
    });

    if( typeof Error.captureStackTrace === "function" ) {
        describe("Should not grow the stack and cause eventually stack overflow.", function(){
            Error.stackTraceLimit = 10000;

            function assertStackIsNotGrowing(stack) {
                assert(stack.split("\n").length > 5);
                assert(stack.split("\n").length < 15);
            }

            specify("Already fulfilled.", function(done) {
                function test(i){
                    if (i <= 0){
                       return Promise.fulfilled(new Error().stack);
                   } else {
                       return Promise.fulfilled(i-1).then(test)
                   }
                }
                test(100).then(function(stack) {
                    assertStackIsNotGrowing(stack);
                    done();
                });
            });

            specify("Already rejected", function(done) {
                function test(i){
                    if (i <= 0){
                       return Promise.rejected(new Error().stack);
                   } else {
                       return Promise.rejected(i-1).then(assert.fail, test)
                   }
                }
                test(100).then(assert.fail, function(stack) {
                    assertStackIsNotGrowing(stack);
                    done();
                });
            });

            specify("Immediately fulfilled", function(done) {
                function test(i){
                    var deferred = Promise.pending();
                    if (i <= 0){
                       deferred.fulfill(new Error().stack);
                       return deferred.promise;
                   } else {
                       deferred.fulfill(i-1);
                       return deferred.promise.then(test)
                   }
                }
                test(100).then(function(stack) {
                    assertStackIsNotGrowing(stack);
                    done();
                });
            });

            specify("Immediately rejected", function(done) {
                function test(i){
                    var deferred = Promise.pending();
                    if (i <= 0){
                       deferred.reject(new Error().stack);
                       return deferred.promise;
                   } else {
                       deferred.reject(i-1);
                       return deferred.promise.then(assert.fail, test)
                   }
                }
                test(100).then(assert.fail, function(stack) {
                    assertStackIsNotGrowing(stack);
                    done();
                });
            });
        });
    }
});
},{"../../js/debug/bluebird.js":21,"assert":2}],91:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

var THIS = {name: "this"};

function CustomError1() {}
CustomError1.prototype = Object.create(Error.prototype);
function CustomError2() {}
CustomError2.prototype = Object.create(Error.prototype);


describe("when using .bind", function() {
    describe("with finally", function() {
        describe("this should refer to the bound object", function() {
            specify( "in straight-forward handler", function(done) {
                fulfilled().bind(THIS).lastly(function(){
                    assert(this === THIS);
                    done();
                });
            });

            specify( "after promise returned from finally resolves", function(done) {
                var d = pending();
                var promise = d.promise;
                var waited = false;
                fulfilled().bind(THIS).lastly(function(){
                    return promise;
                }).lastly(function(){
                    assert(waited);
                    assert(this === THIS);
                    done();
                });

                setTimeout(function(){
                    waited = true;
                    d.fulfill();
                }, 50);
            });
        })

    });

    describe("with timeout", function() {
        describe("this should refer to the bound object", function() {
            specify( "in straight-forward handler", function(done) {
                fulfilled(3).bind(THIS).timeout(500).then(function(v) {
                    assert(v === 3);
                    assert(this === THIS);
                    done();
                });
            });
            specify( "in rejected handler", function(done) {
                rejected(3).bind(THIS).timeout(500).then(assert.fail, function(v){
                    assert(v === 3);
                    assert(this === THIS);
                    done();
                });
            });

            specify( "in rejected handler after timeout", function(done) {
                new Promise(function(){})
                    .bind(THIS).timeout(10).caught(Promise.TimeoutError, function(err){
                    assert(this === THIS);
                    done();
                });
            });
        })

    });

    describe("With catch filters", function() {
        describe("this should refer to the bound object", function() {
            specify( "in an immediately trapped catch handler", function(done) {
                fulfilled().bind(THIS).then(function(){
                    assert(THIS === this);
                    var a;
                    a.b();
                }).caught(Error, function(e){
                    assert(THIS === this);
                    done();
                });
            });
            specify( "in a later trapped catch handler", function(done) {
                fulfilled().bind(THIS).then(function(){
                   throw new CustomError1();
                }).caught(CustomError2, assert.fail)
                .caught(CustomError1, function(e){
                    assert( THIS === this);
                    done();
                });
            });
        });
    });

    describe("With uncancellable promises", function(){
        specify("this should refer to the bound object", function(done) {
            fulfilled().bind(THIS).uncancellable().then(function(){
                assert(this === THIS);
                done();
            });
        });
    });

    describe("With forked promises", function(){
        specify("this should refer to the bound object", function(done) {
            fulfilled().bind(THIS).fork().then(function(){
                assert(this === THIS);
                done();
            });
        });
    });

    describe("With .get promises", function(){
        specify("this should refer to the bound object", function(done) {
            fulfilled({key: "value"}).bind(THIS).get("key").then(function(val){
                assert(val === "value");
                assert(this === THIS);
                done();
            });
        });
    });

    describe("With .call promises", function(){
        specify("this should refer to the bound object", function(done) {
            fulfilled({key: function(){return "value";}}).bind(THIS).call("key").then(function(val){
                assert(val === "value");
                assert(this === THIS);
                done();
            });
        });
    });


    describe("With .done promises", function(){

        describe("this should refer to the bound object", function() {
            specify( "when rejected", function(done) {
                rejected().bind(THIS).done(assert.fail, function(){
                    assert( this === THIS );
                    done();
                });
            });
            specify( "when fulfilled", function(done) {
                fulfilled().bind(THIS).done(function(){
                    assert( this === THIS );
                    done();
                });
            });
        });
    });

    describe("With .spread promises", function(){

        describe("this should refer to the bound object", function() {
            specify( "when spreading immediate array", function(done) {
                fulfilled([1,2,3]).bind(THIS).spread(function(a, b, c){
                    assert(c === 3);
                    assert( this === THIS );
                    done();
                });
            });
            specify( "when spreading eventual array", function(done) {
                var d = pending();
                var promise = d.promise;
                promise.bind(THIS).spread(function(a, b, c){
                    assert(c === 3);
                    assert( this === THIS );
                    done();
                });
                setTimeout(function(){
                    d.fulfill([1,2,3]);
                }, 50);
            });

            specify( "when spreading eventual array of eventual values", function(done) {
                var d = pending();
                var promise = d.promise;
                promise.bind(THIS).spread(function(a, b, c){
                    assert(c === 3);
                    assert( this === THIS );
                    done();
                });
                setTimeout(function(){
                    var d1 = pending();
                    var p1 = d1.promise;

                    var d2 = pending();
                    var p2 = d2.promise;

                    var d3 = pending();
                    var p3 = d3.promise;
                    d.fulfill([p1, p2, p3]);

                    setTimeout(function(){
                        d1.fulfill(1);
                        d2.fulfill(2);
                        d3.fulfill(3);
                    }, 3);
                }, 50);
            });
        });
    });

    describe("With nodeify", function() {
        describe("this should refer to the bound object", function() {
            specify( "when the callback succeeeds", function(done) {
                fulfilled(3).bind(THIS).nodeify(function(err, success){
                    assert( success === 3 );
                    assert( this === THIS );
                    done();
                });
            });
            specify( "when the callback errs", function(done) {
                rejected(3).bind(THIS).nodeify(function(err, success){
                    assert( err === 3 );
                    assert( this === THIS );
                    done();
                });
            });
        });
    });


    describe("With map", function() {
        describe("this should refer to the bound object", function() {
            specify( "inside the mapper with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).map(function(v, i){
                    if( i === 2 ) {
                        assert( this === THIS );
                        done();
                    }
                });
            });
            specify( "inside the mapper with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).map(function(v, i){
                    if( i === 2 ) {
                        assert( this === THIS );
                        done();
                    }
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });

            specify( "after the mapper with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).map(function(){
                    return 1;
                }).then(function(){
                    assert(this === THIS);
                    done();
                });
            });

            specify( "after the mapper with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).map(function(){
                    return 1;
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });

            specify( "after the mapper with immediate values when the map returns promises", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).map(function(){
                    return p1;
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).map(function(){
                    return p1.then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });

    describe("With reduce", function() {
        describe("this should refer to the bound object", function() {
            specify( "inside the reducer with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).reduce(function(prev, v, i){
                    if( i === 2 ) {
                        assert( this === THIS );
                        done();
                    }
                });
            });
            specify( "inside the reducer with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).reduce(function(prev, v, i){
                    if( i === 2 ) {
                        assert( this === THIS );
                        done();
                    }
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });

            specify( "after the reducer with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).reduce(function(){
                    return 1;
                }).then(function(){
                    assert(this === THIS);
                    done();
                });
            });

            specify( "after the reducer with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).reduce(function(){
                    return 1;
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });

            specify( "after the reducer with immediate values when the reducer returns promise", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).reduce(function(){
                    return p1;
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).reduce(function(){
                    return p1.then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });


    describe("With filter", function() {
        describe("this should refer to the bound object", function() {
            specify( "inside the filterer with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).filter(function(v, i){
                    if( i === 2 ) {
                        assert( this === THIS );
                        done();
                    }
                });
            });
            specify( "inside the filterer with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).filter(function(v, i){
                    if( i === 2 ) {
                        assert( this === THIS );
                        done();
                    }
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });

            specify( "after the filterer with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return 1;
                }).then(function(){
                    assert(this === THIS);
                    done();
                });
            });

            specify( "after the filterer with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).filter(function(){
                    return 1;
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });

            specify( "after the filterer with immediate values when the filterer returns promises", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return p1;
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return p1.then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });

    describe("With all", function() {
        describe("this should refer to the bound object", function() {
            specify( "after all with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).all().then(function(v){
                    assert(v.length === 3);
                    assert( this === THIS );
                    done();
                });
            });
            specify( "after all with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).all().then(function(v){
                    assert(v.length === 3);
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return Promise.all([p1]).then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });

    describe("With any", function() {
        describe("this should refer to the bound object", function() {
            specify( "after any with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).any().then(function(v){
                    assert( v === 1 );
                    assert( this === THIS );
                    done();
                });
            });
            specify( "after any with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).any().then(function(v){
                    assert(v === 1);
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return Promise.any([p1]).then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });


    describe("With race", function() {
        describe("this should refer to the bound object", function() {
            specify( "after race with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).race().then(function(v){
                    assert( v === 1 );
                    assert( this === THIS );
                    done();
                });
            });
            specify( "after race with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).race().then(function(v){
                    assert(v === 1);
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return Promise.race([p1]).then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });

    describe("With settle", function() {
        describe("this should refer to the bound object", function() {
            specify( "after settle with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).settle().then(function(v){
                    assert(v.length === 3);
                    assert( this === THIS );
                    done();
                });
            });
            specify( "after settle with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).settle().then(function(v){
                    assert(v.length === 3);
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return Promise.settle([p1]).then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });

    describe("With some", function() {
        describe("this should refer to the bound object", function() {
            specify( "after some with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).some(2).then(function(v){
                    assert.deepEqual(v, [1,2]);
                    assert( this === THIS );
                    done();
                });
            });
            specify( "after some with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).some(2).then(function(v){
                    assert.deepEqual(v, [1,2]);
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });

            specify( "after some with eventual array for eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                var dArray = pending();
                var arrayPromise = dArray.promise;

                arrayPromise.bind(THIS).some(2).then(function(v){
                    assert.deepEqual(v, [1,2]);
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    dArray.fulfill([p1, p2, p3]);
                    setTimeout(function(){
                        d1.fulfill(1);
                        d2.fulfill(2);
                        d3.fulfill(3);
                    }, 50);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).filter(function(){
                    return Promise.some([p1], 1).then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });



    describe("With props", function() {
        describe("this should refer to the bound object", function() {
            specify( "after props with immediate values", function(done) {
                fulfilled([1,2,3]).bind(THIS).props().then(function(v){
                    assert(v[2] === 3);
                    assert( this === THIS );
                    done();
                });
            });
            specify( "after props with eventual values", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                var d2 = pending();
                var p2 = d2.promise;

                var d3 = pending();
                var p3 = d3.promise;

                fulfilled([p1, p2, p3]).bind(THIS).props().then(function(v){
                    assert(v[2] === 3);
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                    d2.fulfill(2);
                    d3.fulfill(3);
                }, 50);
            });
        });

        describe("this should not refer to the bound object", function() {
            specify( "in the promises created within the handler", function(done) {
                var d1 = pending();
                var p1 = d1.promise;

                fulfilled([1,2,3]).bind(THIS).props(function(){
                    return Promise.settle([p1]).then(function(){
                        assert( this !== THIS );
                        return 1;
                    })
                }).then(function(){
                    assert( this === THIS );
                    done();
                });

                setTimeout(function(){
                    d1.fulfill(1);
                }, 50);
            });
        });
    });

});

describe("When using .bind to gratuitously rebind", function(){
    specify("should not get confused", function(done){
        var a = {};
        var b = {};
        var c = {};
        var dones = 0;
        function donecalls() {
            if( ++dones === 3 ) done();
        }

        Promise.bind(a).then(function(){
            assert( this === a );
            donecalls();
        }).bind(b).then(function(){
            assert( this === b );
            donecalls();
        }).bind(c).then(function(){
            assert( this === c );
            donecalls();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],92:[function(require,module,exports){
var process=require("__browserify_process");"use strict";

var isNodeJS = typeof process !== "undefined" && process !== null &&
    typeof process.execPath === "string";

var assert = require("assert");
var OldPromise = require("./helpers/bluebird0_7_0.js");

if( isNodeJS ) {
    var Promise1 = require( "../../js/debug/promise.js")();
    var Promise2 = require( "../../js/debug/promise.js")();

    var err1 = new Error();
    var err2 = new Error();

    describe("Separate instances of bluebird", function() {

        specify("Should have identical Error types", function( done ) {
            assert( Promise1.CancellationError === Promise2.CancellationError );
            assert( Promise1.RejectionError === Promise2.RejectionError );
            assert( Promise1.TimeoutError === Promise2.TimeoutError );
            done();
        });

        specify("Should not be identical", function( done ) {
            assert( Promise1.onPossiblyUnhandledRejection !==
                    Promise2.onPossiblyUnhandledRejection );
            assert( Promise1 !== Promise2 );
            done();
        });

        specify("Should have different unhandled rejection handlers", function(done) {
            var dones = 0;
            var donecall = function() {
                if( ++dones === 2 ) {
                    done();
                }
            }
            Promise1.onPossiblyUnhandledRejection(function(e, promise) {
                assert( promise instanceof Promise1 );
                assert( !(promise instanceof Promise2) );
                assert(e === err1);
                donecall();
            });

            Promise2.onPossiblyUnhandledRejection(function(e, promise) {
                assert( promise instanceof Promise2 );
                assert( !(promise instanceof Promise1) );
                assert(e === err2);
                donecall();
            });

            assert( Promise1.onPossiblyUnhandledRejection !==
                    Promise2.onPossiblyUnhandledRejection );

            var d1 = Promise1.pending();
            var d2 = Promise2.pending();

            d1.promise.then(function(){
                throw err1;
            });

            d2.promise.then(function(){
                throw err2;
            });

            setTimeout(function(){
                d1.fulfill();
                d2.fulfill();
            }, 13);
        });

        specify("Should use fast cast", function(done) {
            var a = Promise1.pending();
            var b = Promise2.cast(a.promise);
            assert(a.promise._receiver0 === b);
            done();
        });

        specify("Should pass through progress with fast cast", function(done){
            var a = Promise1.pending();
            var b = Promise2.cast(a.promise);
            var test = 0;
            b.then(function() {
                test++;
            }, null, function() {
                test++;
            });

            a.progress();
            a.resolve();
            setTimeout(function(){
                assert.equal(test, 2);
                done();
            }, 20);
        });

        specify("Should use fast cast with very old version", function(done) {
            var a = OldPromise.pending();
            var b = Promise1.cast(a.promise);
            assert(a.promise._receiver0 === b);
            done();
        });

        specify("Should pass through progress with fast cast with very old version", function(done){
            var a = OldPromise.pending();
            var b = Promise1.cast(a.promise);
            var test = 0;
            b.then(function() {
                test++;
            }, null, function() {
                test++;
            });

            a.progress();
            a.fulfill();
            setTimeout(function(){
                assert.equal(test, 2);
                done();
            }, 20);
        });

        specify("Should return 2 from very old promise", function(done) {
            Promise1.resolve().then(
                function(){ return OldPromise.cast(0).then(function(){return 2});
            }).then(function(two){
                assert.equal(two, 2);
                done();
            });
        });
    });

}

},{"../../js/debug/promise.js":38,"./helpers/bluebird0_7_0.js":107,"__browserify_process":16,"assert":2}],93:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

var c = {
    val: 3,
    method: function() {
        return [].slice.call(arguments).concat(this.val);
    }
};

describe("call", function() {
    specify("0 args", function(done) {
        Promise.resolve(c).call("method").then(function(res) {
            assert.deepEqual([3], res);
            done();
        });
    });
    specify("1 args", function(done) {
        Promise.resolve(c).call("method", 1).then(function(res) {
            assert.deepEqual([1, 3], res);
            done();
        });
    });
    specify("2 args", function(done) {
        Promise.resolve(c).call("method", 1, 2).then(function(res) {
            assert.deepEqual([1, 2, 3], res);
            done();
        });
    });
    specify("3 args", function(done) {
        Promise.resolve(c).call("method", 1, 2, 3).then(function(res) {
            assert.deepEqual([1, 2, 3, 3], res);
            done();
        });
    });
    specify("10 args", function(done) {
        Promise.resolve(c).call("method", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10).then(function(res) {
            assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 3], res);
            done();
        });
    });
})

},{"../../js/debug/bluebird.js":21,"assert":2}],94:[function(require,module,exports){
"use strict";
/*global describe specify require global*/
//TODO include the copyright
    "use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var delay = Promise.delay;
var CancellationError = adapter.CancellationError;

var sentinel = {
    sentinel: "sentinel"
}; // a sentinel fulfillment value to test for with strict equality
var dummy = {
    dummy: "dummy"
}; // we fulfill or reject with this when we don't intend to test against it

function isCancellationError(error) {
    return error instanceof CancellationError &&
        error.name === "CancellationError";
}

function assertCancelled(promise) {
    assert(promise.isRejected());
    assert(isCancellationError(promise.reason()));
}

describe("If the promise is not cancellable the 'cancel' call has no effect.", function() {
    specify("single-parent", function(done) {
        var parent = pending().promise.cancellable();
        var promise = parent.uncancellable();

        parent.then(assert.fail, assert.fail, assert.fail);
        var result = promise.then(assert.fail, assert.fail, assert.fail);
        promise.cancel();
        setTimeout(function(){
            assert.ok(parent.isCancellable());
            assert.ok(!promise.isCancellable());
            assert.ok(parent.isPending());
            assert.ok(promise.isPending());
            done();
        }, 50)
        return result;
    });

    specify("2 parents", function(done) {
        var grandParent = pending().promise.cancellable();
        var parent = grandParent.then(assert.fail, assert.fail, assert.fail);
        var promise = parent.uncancellable();

        grandParent.then(assert.fail, assert.fail, assert.fail);
        var result = promise.then(assert.fail, assert.fail, assert.fail);
        promise.cancel();
        setTimeout(function(){
            assert.ok(grandParent.isCancellable());
            assert.ok(parent.isCancellable());
            assert.ok(!promise.isCancellable());
            assert.ok(grandParent.isPending());
            assert.ok(parent.isPending());
            assert.ok(promise.isPending());
            done();
        }, 50)
        return result;
    });
});

describe("Cancel.1: If the promise is not pending the 'cancel' call has no effect.", function() {
    specify("already-fulfilled", function(done) {
        var promise = fulfilled(sentinel).cancellable();
        var result = promise.then(function(value) {
            assert.strictEqual(value, sentinel);
            done();
        }, assert.fail);
        promise.cancel();
        return result;
    });

    specify("already-rejected", function(done) {
        var promise = rejected(sentinel).cancellable();
        var result = promise.then(assert.fail, function(reason) {
            assert.strictEqual(reason, sentinel);
            done();
        });
        promise.cancel();
        return result;
    });
});




describe("Cancel.3: If the promise is pending and waiting on another promise the 'cancel' call should instead propagate to this parent promise but MUST be done asynchronously after this call returns.", function() {
    specify("parent pending", function(done) {
        var parentCancelled = false;
        var tuple = pending();
        var parent = tuple.promise.cancellable();
        var unhandled = parent.then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            parentCancelled = true;
            throw reason;
        });
        var promise = parent.then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            assert.ok(parentCancelled);
            done();
            unhandled.caught(function(){});
        })

        promise.cancel();
        return promise;
    });

    specify("grand parent pending", function(done) {
        var grandparentCancelled = false;
        var parentCancelled = false;
        var uncleCancelled = false;

        var tuple = pending();
        var grandparent = tuple.promise.cancellable();


        var uncle = grandparent.then(null, function(reason) {
            throw reason;
        });

        var parent = grandparent.then(assert.fail, function(reason) {
            throw reason;
        });

        var promise = parent.then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            assertCancelled(parent);
            assertCancelled(uncle);
            assertCancelled(grandparent);
            done();
            uncle.caught(function(){});
        });
        assert(promise.isCancellable());
        assert(parent.isCancellable());
        assert(grandparent.isCancellable());
        assert(promise._cancellationParent === parent);
        assert(parent._cancellationParent === grandparent);
        promise.cancel();
    });
});

describe("Cancel.4: Otherwise the promise is rejected with a CancellationError.", function() {
    specify("simple", function(done) {
        var promise = pending().promise.cancellable();
        var result = promise.then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            done();
        });
        promise.cancel();
    });

    specify("then fulfilled assumption", function(done) {
        var assumed = pending().promise.cancellable();
        var promise = fulfilled().cancellable().then(function() {
            return assumed;
        }).then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            assertCancelled(assumed);
            done();
        });

        promise.cancel();
    });

    specify("then rejected assumption", function(done) {
        var assumed = pending().promise.cancellable();

        var promise = rejected().cancellable().then(null, function() {
            return assumed;
        }).then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            assertCancelled(assumed);
            done();
        });

        promise.cancel();
    });


    specify("then chain-fulfilled assumption", function(done) {
        var assumed = pending().promise.cancellable();

        var promise = fulfilled().cancellable().then(function() {
            return fulfilled();
        }).then(function() {
            return assumed;
        }).then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            assertCancelled(assumed);
            done();
        });

        promise.cancel();
    });


    specify("then chain-rejected assumption", function(done) {
        var assumed = pending().promise.cancellable();
        var promise = rejected().cancellable().then(null, function() {
            return rejected();
        }).then(null, function() {
            return assumed;
        }).then(assert.fail, function(reason) {
            assert.ok(isCancellationError(reason));
            assertCancelled(assumed);
            done();
        });
        promise.cancel();
    });
});

describe("issues", function(){
    specify("gh-166", function(done) {
        var f1 = false, f2 = false, f3 = false, f4 = false;
        var a = Promise.resolve().cancellable();
        a = a.then(function() {
            f1 = true;
            return delay(5);
        });

        a = a.then(function() {
            f2 = true;
            return delay(5);
        });

        a = a.then(function() {
            f3 = true;
            return delay(500);
        });

        a = a.then(function() {
            f4 = true;
        });

        var waitingForLongDelay = a;

        a = a.caught(Promise.CancellationError, function() {
            assert(f1); assert(f2); assert(f3);
            assertCancelled(waitingForLongDelay);
            assert(!f4);
            done();
        });

        assert(a.isCancellable());
        setTimeout(function() {
            assert(a.isCancellable());
            a.cancel();
        }, 50);
    });
});

describe("simple", function() {
    specify("should reject with custom error", function(done) {
        var a = new Promise(function(){}).cancellable();
        var err = new Error();
        a.cancel(err);
        a.caught(function(e) {
            assert(e === err);
            done();
        });

    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],95:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

var CustomError = function(){};

CustomError.prototype = new Error();

var predicateFilter = function(e) {
    return (/invalid/).test(e.message);
}

function BadError(msg) {
    this.message = msg;
    return this;
}

function predicatesUndefined(e) {
    return e === void 0;
}

function predicatesPrimitiveString(e) {
    return /^asd$/.test(e);
}

describe("A promise handler that throws a TypeError must be caught", function() {

    specify("in a middle.caught filter", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            a.b.c.d()
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(Promise.TypeError, function(e){
            done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });


    specify("in a generic.caught filter that comes first", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            a.b.c.d()
        }).caught(function(e){
            done();
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(Promise.TypeError, function(e){
            assert.fail();
        });

        a.fulfill(3);
    });

    specify("in an explicitly generic.caught filter that comes first", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            a.b.c.d()
        }).caught(Error, function(e){
            done();
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(Promise.TypeError, function(e){
            assert.fail();
        });

        a.fulfill(3);
    });

    specify("in a specific handler after thrown in generic", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            a.b.c.d()
        }).caught(function(e){
            throw e
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(Promise.TypeError, function(e){
            done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });


    specify("in a multi-filter handler", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            a.b.c.d()
        }).caught(SyntaxError, TypeError, function(e){
           done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });


    specify("in a specific handler after non-matching multi.caught handler", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            a.b.c.d()
        }).caught(SyntaxError, CustomError, function(e){
           assert.fail();
        }).caught(Promise.TypeError, function(e){
           done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });

});


describe("A promise handler that throws a custom error", function() {

    specify( "Is filtered if inheritance was done even remotely properly", function(done) {
        var a = Promise.pending();
        var b = new CustomError();
        a.promise.then(function(){
            throw b;
        }).caught(SyntaxError, function(e){
           assert.fail();
        }).caught(Promise.TypeError, function(e){
           assert.fail();
        }).caught(CustomError, function(e){
            assert.equal( e, b );
            done();
        });

        a.fulfill(3);
    });

    specify( "Is filtered along with built-in errors", function(done) {
        var a = Promise.pending();
        var b = new CustomError();
        a.promise.then(function(){
            throw b;
        }).caught(Promise.TypeError, SyntaxError, CustomError, function(e){
           done()
        }).caught(assert.fail);

        a.fulfill(3);
    });
});

describe("A promise handler that throws a CustomError must be caught", function() {
    specify("in a middle.caught filter", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            throw new CustomError()
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(CustomError, function(e){
            done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });


    specify("in a generic.caught filter that comes first", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            throw new CustomError()
        }).caught(function(e){
            done();
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(CustomError, function(e){
            assert.fail();
        });

        a.fulfill(3);
    });

    specify("in an explicitly generic.caught filter that comes first", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            throw new CustomError()
        }).caught(Error, function(e){
            done();
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(CustomError, function(e){
            assert.fail();
        });

        a.fulfill(3);
    });

    specify("in a specific handler after thrown in generic", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            throw new CustomError()
        }).caught(function(e){
            throw e
        }).caught(SyntaxError, function(e){
            assert.fail();
        }).caught(CustomError, function(e){
            done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });


    specify("in a multi-filter handler", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            throw new CustomError()
        }).caught(SyntaxError, CustomError, function(e){
           done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });


    specify("in a specific handler after non-matching multi.caught handler", function(done) {
        var a = Promise.pending();

        a.promise.then(function(){
            throw new CustomError()
        }).caught(SyntaxError, TypeError, function(e){
           assert.fail();
        }).caught(CustomError, function(e){
           done();
        }).caught(function(e){
            assert.fail();
        });

        a.fulfill(3);
    });

});

describe("A promise handler that is caught in a filter", function() {

    specify( "is continued normally after returning a promise in filter", function(done) {
         var a = Promise.pending();
         var c = Promise.pending();
         var b = new CustomError();
         a.promise.then(function(){
             throw b;
         }).caught(SyntaxError, function(e){
            assert.fail();
         }).caught(Promise.TypeError, function(e){
            assert.fail();
         }).caught(CustomError, function(e){
            assert.equal( e, b );
            return c.promise;
         }).then(function(){done()}, assert.fail, assert.fail);

         a.fulfill(3);
         setTimeout(function(){
             c.fulfill(3);
         }, 200 );
    });

    specify( "is continued normally after returning a promise in original handler", function(done) {
         var a = Promise.pending();
         var c = Promise.pending();
         var b = new CustomError();
         a.promise.then(function(){
             return c.promise;
         }).caught(SyntaxError, function(e){
            assert.fail();
         }).caught(Promise.TypeError, function(e){
            assert.fail();
         }).caught(CustomError, function(e){
            assert.fail();
         }).then(function(){done()}, assert.fail, assert.fail);

         a.fulfill(3);
         setTimeout(function(){
             c.fulfill(3);
         }, 200 );
    });
});

describe("A promise handler with a predicate filter", function() {

    specify("will catch a thrown thing matching the filter", function(done) {
        var a = Promise.pending();
        a.promise.then(function(){
            throw new Error("horrible invalid error string");
        }).caught(predicateFilter, function(e){
            done();
        }).caught(function(e){
            assert.fail();
        });
        a.fulfill(3);

    });
    specify("will NOT catch a thrown thing not matching the filter", function(done) {
        var a = Promise.pending();
        a.promise.then(function(){
            throw new Error("horrible valid error string");
        }).caught(predicateFilter, function(e){
            assert.fail();
        }).caught(function(e){
            done();
        });
        a.fulfill(3);

    });

    specify("will fail when a predicate is a bad error class", function(done) {
        var a = Promise.pending();
        a.promise.then(function(){
            throw new Error("horrible custom error");
        }).caught(BadError, function(e){
            assert.fail();
        }).caught(function(e){
            // Comment-out to show the TypeError stack
            //console.error(e.stack);
            done();
        });
        a.fulfill(3);
    });

    specify("will catch a thrown undefiend", function(done){
        var a = Promise.pending();
        a.promise.then(function(){
            throw void 0;
        }).caught(function(e) { return false }, function(e){
            assert.fail();
        }).caught(predicatesUndefined, function(e){
            done();
        }).caught(function(e) {
            assert.fail();
        });
        a.fulfill(3);
    });

    specify("will catch a thrown string", function(done){
        var a = Promise.pending();
        a.promise.then(function(){
            throw "asd";
        }).caught(function(e) { return false }, function(e){
            assert.fail();
        }).caught(predicatesPrimitiveString, function(e){
            done();
        }).caught(function(e) {
            assert.fail();
        });
        a.fulfill(3);
    });

    specify("will fail when a predicate throws", function(done) {
        var a = Promise.pending();
        a.promise.then(function(){
            throw new CustomError("error happens");
        }).caught(function(e) { return e.f.g; }, function(e){
            assert.fail();
        }).caught(TypeError, function(e){
            //console.error(e.stack);
            done();
        }).caught(function(e) {
            assert.fail();
        });
        a.fulfill(3);


    });


});


},{"../../js/debug/bluebird.js":21,"assert":2}],96:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

function Thenable(value, defer, reject) {
    this.value = value;
    this.defer = !!defer;
    this.reject = !!reject;
}

Thenable.prototype.then = function Then$then(onFulfilled, onRejected) {
    var fn = this.reject ? onRejected : onFulfilled;
    var value = this.value;

    if (this.defer) {
        setTimeout(function(){
            fn(value);
        }, 40)
    }
    else {
        fn(value);
    }

};

function testFulfillSync(name, cb, a1, a2, a3) {
    var thenables = [new Thenable(1), new Thenable(2), new Thenable(3)];

    specify("Promise." + name + " thenables that fulfill synchronously", function(done){
        cb(Promise[name](thenables, a1, a2, a3), done);
    });

}

function testFulfillAsync(name, cb, a1, a2, a3) {
    var thenables = [new Thenable(1, true), new Thenable(2, true), new Thenable(3, true)];

    specify("Promise." + name + " thenables that fulfill asynchronously", function(done){
        cb(Promise[name](thenables, a1, a2, a3), done);
    });
}

function testRejectSync(name, cb, a1, a2, a3) {
    var thenables = [new Thenable(1, false, true), new Thenable(2, false, true), new Thenable(3, false, true)];

    specify("Promise." + name + " thenables that reject synchronously", function(done){
        cb(Promise[name](thenables, a1, a2, a3), done);
    });

}

function testRejectAsync(name, cb, a1, a2, a3) {
    var thenables = [new Thenable(1, true, true), new Thenable(2, true, true), new Thenable(3, true, true)];

    specify("Promise." + name + " thenables that reject asynchronously", function(done){
        cb(Promise[name](thenables, a1, a2, a3), done);
    });
}


describe("Using collection methods with thenables", function() {
    var name = "race";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert(v === 1);
            done();
        });
    });
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert(v === 1);
            done();
        });
    });
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v === 1);
            done();
        });
    });
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v === 1);
            done();
        });
    });
});

describe("Using collection methods with thenables", function() {
    var name = "all";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, [1,2,3]);
            done();
        });
    });
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, [1,2,3]);
            done();
        });
    });
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v === 1);
            done();
        });
    });
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v === 1);
            done();
        });
    });
});

describe("Using collection methods with thenables", function() {
    var name = "settle";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v) {
            assert(v[0].value() === 1)
            assert(v[1].value() === 2)
            assert(v[2].value() === 3)
            done();
        });
    });
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0].value() === 1)
            assert(v[1].value() === 2)
            assert(v[2].value() === 3)
            done();
        });
    });
    testRejectSync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0].error() === 1)
            assert(v[1].error() === 2)
            assert(v[2].error() === 3)
            done();
        });
    });
    testRejectAsync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0].error() === 1)
            assert(v[1].error() === 2)
            assert(v[2].error() === 3)
            done();
        });
    });
});

describe("Using collection methods with thenables", function() {
    var name = "any";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert(v === 1);
            done();
        });
    });
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert(v === 1);
            done();
        });
    });
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v[0] === 1);
            assert(v[1] === 2);
            assert(v[2] === 3);
            done();
        });
    });
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v[0] === 1);
            assert(v[1] === 2);
            assert(v[2] === 3);
            done();
        });
    });
});

describe("Using collection methods with thenables", function() {
    var name = "some";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0] === 1);
            done();
        });
    }, 1);
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0] === 1);
            done();
        });
    }, 1);
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v[0] === 1);
            assert(v[1] === 2);
            assert(v[2] === 3);
            done();
        });
    }, 1);
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert(v[0] === 1);
            assert(v[1] === 2);
            assert(v[2] === 3);
            done();
        });
    }, 1);
});

describe("Using collection methods with thenables", function() {
    var name = "join";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0][0].value === 1);
            assert(v[0][1].value === 2);
            assert(v[0][2].value === 3);
            assert(v[1] === 1);
            assert(v[2] === 2);
            assert(v[3] === 3);
            done();
        });
    }, 1, 2, 3);
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0][0].value === 1);
            assert(v[0][1].value === 2);
            assert(v[0][2].value === 3);
            assert(v[1] === 1);
            assert(v[2] === 2);
            assert(v[3] === 3);
            done();
        });
    }, 1, 2, 3);
    testRejectSync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0][0].value === 1);
            assert(v[0][1].value === 2);
            assert(v[0][2].value === 3);
            assert(v[1] === 1);
            assert(v[2] === 2);
            assert(v[3] === 3);
            done();
        });
    }, 1, 2, 3);
    testRejectAsync(name, function(promise, done) {
        promise.then(function(v){
            assert(v[0][0].value === 1);
            assert(v[0][1].value === 2);
            assert(v[0][2].value === 3);
            assert(v[1] === 1);
            assert(v[2] === 2);
            assert(v[3] === 3);
            done();
        });
    }, 1, 2, 3);
});

function mapper(v) {
    return {
        then: function(f) {
            f(v*2);
        }
    };
}
function reducer(a, b) {
    return a + b;
}
function filterer(v) {
    return {
        then: function(f) {
            f(v > 0);
        }
    };
}

describe("Using collection methods with thenables", function() {
    var name = "map";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, [2,4,6]);
            done();
        });
    }, mapper);
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, [2,4,6]);
            done();
        });
    }, mapper);
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, mapper);
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, mapper);
});

describe("Using collection methods with thenables", function() {
    var name = "reduce";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, 6);
            done();
        });
    }, reducer);
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, 6);
            done();
        });
    }, reducer);
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, reducer);
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, reducer);
});

describe("Using collection methods with thenables", function() {
    var name = "filter";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, [1,2,3]);
            done();
        });
    }, filterer);
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, [1,2,3]);
            done();
        });
    }, filterer);
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, filterer);
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, filterer);
});

describe("Using collection methods with thenables", function() {
    var name = "props";
    testFulfillSync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, {0: 1, 1: 2, 2: 3});
            done();
        });
    }, filterer);
    testFulfillAsync(name, function(promise, done) {
        promise.then(function(v){
            assert.deepEqual(v, {0: 1, 1: 2, 2: 3});
            done();
        });
    }, filterer);
    testRejectSync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, filterer);
    testRejectAsync(name, function(promise, done) {
        promise.then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    }, filterer);
});

},{"../../js/debug/bluebird.js":21,"assert":2}],97:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

function fulfills(value, test) {
    specify("immediately-fulfilled", function (done) {
        test(new Promise(function(resolve){
            resolve(value);
        }), done);
    });

    specify("eventually-fulfilled", function (done) {
        test(new Promise(function(resolve){
            setTimeout(function(){
                resolve(value);
            }, 13);
        }), done);
    });
};

function rejects(reason, test) {
    specify("immediately-rejected", function (done) {
        test(new Promise(function(resolve, reject){
            reject(reason);
        }), done);
    });

    specify("eventually-rejected", function (done) {
        test(new Promise(function(resolve, reject){
            setTimeout(function(){
                reject(reason);
            }, 13);
        }), done);
    });
};

function testFulfilled(value, test) {
    describe("immediate value", function(){
        fulfills(value, test);
    });

    describe("already fulfilled promise for value", function(){
        fulfills(Promise.resolve(value), test);
    });

    describe("immediately fulfilled promise for value", function(){
        var a = Promise.defer();
        fulfills(a.promise, test);
        a.resolve(value);
    });

    describe("eventually fulfilled promise for value", function(){
        var a = Promise.defer();
        fulfills(a.promise, test);
        setTimeout(function(){
            a.resolve(value);
        }, 13)

    });

    describe("synchronous thenable for value", function () {
        fulfills({
            then: function (f) {
                f(value);
            }
        }, test);
    });

    describe("asynchronous thenable for value", function () {
        fulfills({
            then: function (f) {
                setTimeout(function () {
                    f(value);
                }, 13);
            }
        }, test);
    });
}

function testRejected(reason, test) {
    describe("immediate reason", function(){
        rejects(reason, test);
    });
}


describe("Promise constructor", function() {
    it("should throw type error when called as function", function(done) {
        try {
            Promise(function(){});
        }
        catch (e) {
            done();
        }
    });

    it("should throw type error when passed non-function", function(done) {
        try {
            new Promise({});
        }
        catch (e) {
            done();
        }
    });


    var defaultThis = (function(){
        return this;
    })();

    it("calls the resolver as a function", function(done){
        new Promise(function() {
            assert(this === defaultThis);
            done();
        });
    });

    it("passes arguments even if parameters are not defined", function(done){
        new Promise(function() {
            assert(arguments.length === 2);
            done();
        });
    });


    it("should reject with any thrown error", function(done) {
        var e = new Error();
        new Promise(function(){
            throw e;
        }).then(assert.fail, function(err) {
            assert(err === e)
            done();
        });
    });

    it("should call the resolver function synchronously", function(done) {
        var e = new Error();
        var a = 0;
        new Promise(function(){
            a = 1;
        });
        assert(a === 1);
        done();
    });


    describe("resolves the promise with the given object value", function() {
        var value = {};
        testFulfilled(value, function(promise, done) {
            promise.then(function(v){
                assert(v === value);
                done();
            });
        });
    });

    describe("resolves the promise with the given primitive value", function() {
        var value = 3;
        testFulfilled(value, function(promise, done) {
            promise.then(function(v){
                assert(v === value);
                done();
            });
        });
    });

    describe("resolves the promise with the given undefined value", function() {
        var value = void 0;
        testFulfilled(value, function(promise, done) {
            promise.then(function(v){
                assert(v === value);
                done();
            });
        });
    });

    describe("rejects the promise with the given object reason", function() {
        var reason = {};
        testRejected(reason, function(promise, done) {
            promise.then(assert.fail, function(v){
                assert(v === reason);
                done();
            });
        });
    });

    describe("rejects the promise with the given primitive reason", function() {
        var reason = 3;
        testRejected(reason, function(promise, done) {
            promise.then(assert.fail, function(v){
                assert(v === reason);
                done();
            });
        });
    });

    describe("rejects the promise with the given undefined reason", function() {
        var reason = void 0;
        testRejected(reason, function(promise, done) {
            promise.then(assert.fail, function(v){
                assert(v === reason);
                done();
            });
        });
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],98:[function(require,module,exports){
"use strict";

var assert = require("assert");

var helpers = require("./helpers/testThreeCases.js");
var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var TypeError = Promise.TypeError;

function passthru(fn) {
    return function() {
        fn();
    };
}

describe("Cyclical promises should throw TypeError when", function(){
    describe("returning from fulfill", function() {
        helpers.testFulfilled(3, function(promise, done) {
            var self = promise.then(function() {
                return self;
            });

            self.caught(TypeError, passthru(done));
        });
    });

    describe("returning from reject", function() {
        helpers.testRejected(3, function(promise, done) {
            var self = promise.caught(function() {
                return self;
            });

            self.caught(TypeError, passthru(done));
        });
    });

    describe("fulfill with itself when using a ", function() {
        specify("deferred", function(done) {
            var d = Promise.pending();
            d.fulfill(d.promise);
            d.promise.caught(TypeError, passthru(done));
        });

        specify("constructor", function(done) {
            var resolve;
            var p = new Promise(function(r) {
                resolve = r;
            });
            resolve(p);
            p.caught(TypeError, passthru(done));
        });
    });

    describe("reject with itself when using a ", function() {
        specify("deferred", function(done) {
            var d = Promise.pending();
            d.reject(d.promise);
            d.promise.caught(TypeError, passthru(done));
        });

        specify("constructor", function(done) {
            var reject;
            var p = new Promise(function(f, r) {
                reject = r;
            });
            reject(p);
            p.caught(TypeError, passthru(done));
        });
    });
});

},{"../../js/debug/bluebird.js":21,"./helpers/testThreeCases.js":109,"assert":2}],99:[function(require,module,exports){
"use strict";

"use strict";

var assert = require("assert");

var helpers = require("./helpers/testThreeCases.js");
var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var TypeError = Promise.TypeError;

function passthru(fn) {
    return function() {
        fn();
    };
}

function wrap(fn, val) {
    var args = [].slice.call(arguments, 1);
    return function() {
        return fn.apply(this, args);
    }
}

function returnValue(value) {
    helpers.testFulfilled(void 0, function(promise, done) {
        promise.thenReturn(value).then(function(v){
            assert(v === value);
            done();
        });
    });
}

function throwValue(value) {
    helpers.testFulfilled(void 0, function(promise, done) {
        promise.thenThrow(value).then(assert.fail, function(v) {
            assert(v === value);
            done();
        });
    });
}

function returnThenable(thenable, expected) {
    helpers.testFulfilled(void 0, function(promise, done) {
        promise.thenReturn(thenable).then(function(v){
            assert(v === expected);
            done();
        });
    });
}

function returnThenableReject(thenable, expected) {
    helpers.testFulfilled(void 0, function(promise, done) {
        promise.thenReturn(thenable).then(assert.fail, function(v){
            assert(v === expected);
            done();
        });
    });
}

describe("thenReturn", function () {

    describe("primitives", function() {
        describe("null", wrap(returnValue, null));
        describe("undefined", wrap(returnValue, void 0));
        describe("string", wrap(returnValue, "asd"));
        describe("number", wrap(returnValue, 3));
        describe("boolean", wrap(returnValue, true));
    });

    describe("objects", function() {
        describe("plain", wrap(returnValue, {}));
        describe("function", wrap(returnValue, function(){}));
        describe("built-in function", wrap(returnValue, Array));
        describe("built-in object", wrap(returnValue, Math));
    });

    describe("thenables", function() {
        describe("which fulfill", function() {
            describe("immediately", wrap(returnThenable, {
                then: function(f) {
                    f(10);
                }
            }, 10));
            describe("eventually", wrap(returnThenable, {
                then: function(f) {
                    setTimeout(function() {
                        f(10);
                    }, 13);
                }
            }, 10));
        });
        describe("which reject", function(){
            describe("immediately", wrap(returnThenableReject, {
                then: function(f, r) {
                    r(10);
                }
            }, 10));
            describe("eventually", wrap(returnThenableReject, {
                then: function(f, r) {
                    setTimeout(function() {
                        r(10);
                    }, 13);
                }
            }, 10));
        });
    });

    describe("promises", function() {
        describe("which fulfill", function() {
            var d1 = Promise.pending();
            var d2 = Promise.pending();
            describe("already", wrap(returnThenable, fulfilled(10), 10));
            describe("immediately", wrap(returnThenable, d1.promise, 10));
            describe("eventually", wrap(returnThenable, d2.promise, 10));
            d1.fulfill(10);
            setTimeout(function(){
                d2.fulfill(10);
            }, 13);
        });
        describe("which reject", function() {
            var d1 = Promise.pending();
            var d2 = Promise.pending();
            var alreadyRejected = rejected(10);
            alreadyRejected.caught(function(){});
            describe("already", wrap(returnThenableReject, alreadyRejected, 10));
            describe("immediately", wrap(returnThenableReject, d1.promise, 10));
            describe("eventually", wrap(returnThenableReject, d2.promise, 10));
            d1.reject(10);
            setTimeout(function(){
                d2.reject(10);
            }, 13);

            d1.promise.caught(function(){});
            d2.promise.caught(function(){});
        });

    });

    describe("doesn't swallow errors", function() {
        var e = {};
        helpers.testRejected(e, function(promise, done){
            promise.thenReturn(3).then(assert.fail, function(err) {
                assert(err = e);
                done();
            });
        });
    });
});

describe("thenThrow", function () {

    describe("primitives", function() {
        describe("null", wrap(throwValue, null));
        describe("undefined", wrap(throwValue, void 0));
        describe("string", wrap(throwValue, "asd"));
        describe("number", wrap(throwValue, 3));
        describe("boolean", wrap(throwValue, true));
    });

    describe("objects", function() {
        describe("plain", wrap(throwValue, {}));
        describe("function", wrap(throwValue, function(){}));
        describe("built-in function", wrap(throwValue, Array));
        describe("built-in object", wrap(throwValue, Math));
    });

    describe("doesn't swallow errors", function() {
        var e = {};
        helpers.testRejected(e, function(promise, done){
            promise.thenThrow(3).then(assert.fail, function(err) {
                assert(err = e);
                done();
            });
        });
    });
});

},{"../../js/debug/bluebird.js":21,"./helpers/testThreeCases.js":109,"assert":2}],100:[function(require,module,exports){
var process=require("__browserify_process");"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var isNodeJS = typeof process !== "undefined" &&
    typeof process.execPath === "string";


if (isNodeJS) {
    describe("domain", function(){
        specify("gh-148", function(done) {
            Promise.onPossiblyUnhandledRejection(function(error,promise) {
                throw error
            });
            var called = false;
            var e = new Error();
            Promise.resolve(23).then(function(){called = true});
            require('domain').create()
              .on('error', function(E) {
                assert.equal(e, E);
                assert(called);
                done();
              })
              .run(function() {
                  var P = new Promise(function(resolve,reject){ reject(e) });
              });

        });
    });
}

},{"../../js/debug/bluebird.js":21,"__browserify_process":16,"assert":2,"domain":3}],101:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var Promise = adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

function promised(val) {
    return new Promise(function(f) {
        setTimeout(function() {
            f(val);
        }, 4);
    });
}

function thenabled(val, arr) {
    return {
        then: function(f){
            setTimeout(function() {
                if (arr) arr.push(val);
                f(val);
            }, 4);
        }
    };
}

describe("Promise.prototype.each", function() {


    it("should return the array's values", function(done) {
        var a = [promised(1), promised(2), promised(3)];
        var b = [];
        Promise.each(a, function(val) {
            b.push(3-val);
            return val;
        }).then(function(ret) {
            assert.deepEqual(ret, [1,2,3]);
            assert.deepEqual(b, [2, 1, 0]);
            done();
        });
    });


    it("takes value, index and length", function(done) {
        var a = [promised(1), promised(2), promised(3)];
        var b = [];
        Promise.each(a, function(value, index, length) {
            b.push(value, index, length);
        }).then(function(ret) {
            assert.deepEqual(b, [1, 0, 3, 2, 1, 3, 3, 2, 3]);
            done();
        });
    });

    it("waits for returned promise before proceeding next", function(done) {
        var a = [promised(1), promised(2), promised(3)];
        var b = [];
        Promise.each(a, function(value) {
            b.push(value);
            return Promise.delay(10).then(function(){
                b.push(value*2);
            });
        }).then(function(ret) {
            assert.deepEqual(b, [1,2,2,4,3,6]);
            done();
        });
    });

    it("waits for returned thenable before proceeding next", function(done) {
        var b = [1, 2, 3];
        var a = [thenabled(1), thenabled(2), thenabled(3)];
        Promise.each(a, function(val) {
            b.push(val * 50);
            return thenabled(val * 500, b);
        }).then(function(ret) {
            assert.deepEqual(b, [1, 2, 3, 50, 500, 100, 1000, 150, 1500]);
            done();
        });
    });

    it("doesnt iterate with an empty array", function(done) {
        Promise.each([], function(val) {
            throw new Error();
        }).then(function(ret) {
            assert.deepEqual(ret, []);
            done();
        });
    });

    it("iterates with an array of single item", function(done) {
        var b = [];
        Promise.each([promised(1)], function(val) {
            b.push(val);
            return thenabled(val*2, b);
        }).then(function(ret) {
            assert.deepEqual(b, [1,2]);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],102:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

describe("Promise.prototype.error", function(){
    describe("catches stuff originating from explicit rejections", function() {
        specify("using constructor", function(done) {
            var e = new Error("sup");
            new Promise(function(resolve, reject) {
                reject(e);
            }).error(function(err){
                assert(err === e);
                done();
            });
        });
        specify("using Promise.reject", function(done) {
            var e = new Error("sup");
            Promise.reject(e).error(function(err) {
                assert(err === e);
                done();
            });
        });
        specify("using deferred", function(done) {
            var e = new Error("sup");
            var d = Promise.defer();
            d.promise.error(function(err) {
                assert(err === e);
                done();
            });
            d.reject(e);
        });

        specify("using callback", function(done) {
            var e = new Promise.TypeError("sup");
            function callsback(a, b, c, fn) {
                fn(e);
            }
            callsback = Promise.promisify(callsback);

            callsback(1, 2, 3).error(function(err) {
                assert(err === e);
                done();
            });
        });
    });

    describe("does not catch stuff originating from thrown errors", function() {
        specify("using constructor", function(done) {
            var e = new Error("sup");
            new Promise(function(resolve, reject) {
                throw e;
            }).error(function(err) {
                assert.fail();
            }).caught(function(err){
                assert(err === e);
                done();
            });
        });
        specify("using thenable", function(done) {
            var e = new Error("sup");
            var thenable = {
                then: function(resolve, reject){
                    reject(e);
                }
            };
            Promise.cast(thenable).error(function(err) {
                console.error(err);
                assert.fail();
            }).caught(function(err) {
                assert(err === e);
                done();
            });
        });
        specify("using callback", function(done) {
            var e = new Error("sup");
            function callsback(a, b, c, fn) {
                throw e;
            }
            callsback = Promise.promisify(callsback);

            callsback(1, 2, 3).error(function(err) {
                assert.fail();
            }).caught(function(err){
                assert(err === e);
                done();
            });
        });
    });

    specify("gh-54-1", function(done) {
        function doThing(arg) {
          return new Promise(function (resolve, reject) {
            if (typeof arg !== "string") return reject(new Error("invalid thing"));
          });
        }

        doThing().error(function(){
            done();
        }).caught(function(){
            assert.fail();
        });

    });

    specify("gh-54-2", function(done) {
        function doBuggyThing(arg) {
          return new Promise(function (resolve, rej) {
            // arg2 & reject dont exist. this is buggy.
            if (arg2 && typeof arg2 !== "string") return reject(new Error("invalid thing"));
          });
        }
        var called = false;
        doBuggyThing().error(function(){
            called = true;
        }).caught(function() {

        });

        setTimeout(function(){
            assert(!called);
            done();
        }, 13);

    });
})

},{"../../js/debug/bluebird.js":21,"assert":2}],103:[function(require,module,exports){
"use strict";
    "use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var Promise = adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

describe("Promise filter", function() {

    function ThrownError() {}


    var arr = [1,2,3];

    function assertArr(arr) {
        assert(arr.length === 2);
        assert(arr[0] === 1);
        assert(arr[1] === 3);
    }

    function assertErr(e) {
        assert(e instanceof ThrownError);
    }

    function assertFail() {
        assert.fail();
    }

    function cd(done) {
        return function() {
            done();
        };
    }

    describe("should accept eventual booleans", function() {
        specify("immediately fulfilled", function(done) {
            Promise.filter(arr, function(v) {
                return new Promise(function(r){
                    r(v !== 2);
                });
            }).then(assertArr).then(cd(done));
        });

        specify("already fulfilled", function(done) {
            Promise.filter(arr, function(v) {
                return Promise.resolve(v !== 2);
            }).then(assertArr).then(cd(done));
        });

        specify("eventually fulfilled", function(done) {
            Promise.filter(arr, function(v) {
                return new Promise(function(r){
                    setTimeout(function(){
                        r(v !== 2);
                    }, 13);
                });
            }).then(assertArr).then(cd(done));
        });

        specify("immediately rejected", function(done) {
            Promise.filter(arr, function(v) {
                return new Promise(function(v, r){
                    r(new ThrownError());
                });
            }).then(assertFail, assertErr).then(cd(done));
        });
        specify("already rejected", function(done) {
            Promise.filter(arr, function(v) {
                return Promise.reject(new ThrownError());
            }).then(assertFail, assertErr).then(cd(done));
        });
        specify("eventually rejected", function(done) {
            Promise.filter(arr, function(v) {
                return new Promise(function(v, r){
                    setTimeout(function(){
                        r(new ThrownError());
                    }, 13);
                });
            }).then(assertFail, assertErr).then(cd(done));
        });


        specify("immediately fulfilled thenable", function(done) {
            Promise.filter(arr, function(v) {
                return {
                    then: function(f, r) {
                        f(v !== 2);
                    }
                };
            }).then(assertArr).then(cd(done));
        });
        specify("eventually fulfilled thenable", function(done) {
            Promise.filter(arr, function(v) {
                return {
                    then: function(f, r) {
                        setTimeout(function(){
                            f(v !== 2);
                        }, 13);
                    }
                };
            }).then(assertArr).then(cd(done));
        });

        specify("immediately rejected thenable", function(done) {
            Promise.filter(arr, function(v) {
                return {
                    then: function(f, r) {
                        r(new ThrownError());
                    }
                };
            }).then(assertFail, assertErr).then(cd(done));
        });
        specify("eventually rejected thenable", function(done) {
            Promise.filter(arr, function(v) {
                return {
                    then: function(f, r) {
                        setTimeout(function(){
                            r(new ThrownError());
                        }, 13);
                    }
                };
            }).then(assertFail, assertErr).then(cd(done));
        });

    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],104:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

describe("a promise A that is following a promise B", function() {
    specify("Must not react to fulfill/reject/progress that don't come from promise B", function(done) {
        var deferred = Promise.pending();
        var promiseA = deferred.promise;
        var promiseB = Promise.pending().promise;

        promiseA.then(
            assert.fail,
            assert.fail,
            assert.fail
        );
        deferred.fulfill(promiseB);

        deferred.progress(1);
        deferred.fulfill(1);
        deferred.reject(1);
        setTimeout(function(){
            assert.equal( promiseA.isPending(), true );
            assert.equal( promiseB.isPending(), true );
            done();
        }, 30);
    });

    specify("Must not start following another promise C", function(done) {
        var deferred = Promise.pending();
        var promiseA = deferred.promise;
        var promiseB = Promise.pending().promise;
        var deferredC = Promise.pending();
        var promiseC = deferredC.promise;

        promiseA.then(
            assert.fail,
            assert.fail,
            assert.fail
        );
        deferred.fulfill(promiseB);
        deferred.fulfill(promiseC);

        deferredC.progress(1);
        deferredC.fulfill(1);
        deferredC.reject(1);

        promiseC.then(function() {
            assert.equal( promiseA.isPending(), true );
            assert.equal( promiseB.isPending(), true );
            assert.equal( promiseC.isPending(), false );
            done();
        });
    });

    specify("Must react to fulfill/reject/progress that come from promise B", function(done) {
        var deferred = Promise.pending();
        var promiseA = deferred.promise;
        var deferredFollowee = Promise.pending();
        var promiseB = deferredFollowee.promise;

        var c = 0;

        promiseA.then(function(v){
            c++;
            assert.equal(c, 2);
            assert.equal(v, 1);
            done();
        }, assert.fail, function(v){
            c++;
            assert.equal(v, 1);
        });

        deferred.fulfill(promiseB);


        deferredFollowee.progress(1);
        deferredFollowee.fulfill(1);
        deferredFollowee.reject(1);

    });

    specify("Should be instantly fulfilled with Bs fulfillment value if B was fulfilled", function(done) {
        var val = {};
        var B = Promise.fulfilled(val);
        var A = Promise.fulfilled(B);
        assert.equal( A.value(), val );
        assert.equal( A.value(), B.value() );
        done();
    });

    specify("Should be instantly fulfilled with Bs parent fulfillment value if B was fulfilled with a parent", function(done) {
        var val = {};
        var parent = Promise.fulfilled(val);
        var B = Promise.fulfilled(parent);
        var A = Promise.fulfilled(B);
        assert.equal( A.value(), val );
        assert.equal( A.value(), B.value() );
        assert.equal( A.value(), parent.value() );
        done();
    });


});

describe("Rejecting a promise A with promise B", function(){
    specify("Should reject promise A with B as reason ", function(done) {
        var val = {};
        var B = Promise.fulfilled(val);
        var A = Promise.rejected(B);
        assert.equal( A.reason(), B );
        A.caught(function(){});
        done();
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],105:[function(require,module,exports){
"use strict";
var assert = require("assert");
var Promise= require("../../js/debug/bluebird.js");
var join = Promise.join;

describe("indexed getter", function() {
    var p = Promise.resolve([0, 1, 2, 3, 4, 5, 7, 5,10]);
    specify("gets index", function(done) {
        var first = p.get(0);
        var fourth = p.get(3);
        var last = p.get(8);

        join(first, fourth, last, function(a, b, c) {
            assert(a === 0);
            assert(b === 3);
            assert(c === 10);
            done();
        });
    });
});

describe("identifier getter", function() {
    var p = Promise.resolve(new RegExp("", ""));
    specify("gets property", function(done) {
        var ci = p.get("ignoreCase");
        var g = p.get("global");
        var lastIndex = p.get("lastIndex");
        var multiline = p.get("multiline");

        join(ci, g, lastIndex, multiline, function(ci, g, lastIndex, multiline) {
            assert(ci === false);
            assert(g === false);
            assert(lastIndex === 0);
            assert(multiline === false);
            done();
        });
    });
});

describe("non identifier getter", function() {
    var p = Promise.resolve({"-": "val"});
    specify("gets property", function(done) {
        p.get("-").then(function(val) {
            assert(val === "val");
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],106:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

describe("github36", function(){
    specify("should work", function(done){
        var called = 0;
        var donecalled = false;
        var _d = Promise.defer();

        _d.resolve()

        var f1 = function() {
            return _d.promise.then(function() {
                return true;
            })
        }

        var f2 = function() {
            var d1 = Promise.defer()

            setTimeout(function() {
                d1.resolve()
            }, 10)

            return d1.promise.then(function() {
                return _d.promise.then(function() {
                })
            });
        }

        var f3 = function() {
            called++;
            if(called > 15) {
                if (!donecalled) {
                    donecalled = true;
                    done();
                }
                return;
            }
            var promise = f1().then(function() {
                f2()
                    .then(function() {
                        f3()
                    })
            })

            promise.lastly(function() {
                setTimeout(function() {
                    f3()
                }, 10)
            })

        }

        f3();
    });
});


},{"../../js/debug/bluebird.js":21,"assert":2}],107:[function(require,module,exports){
var process=require("__browserify_process");/* jshint -W014, -W116, -W106 */
/* global process, unreachable */
/**
 * @preserve Copyright (c) 2013 Petka Antonov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function( global, Function, Array, Error, Object ) {"use strict";

var ASSERT = (function(){/* jshint -W014, -W116 */
    var AssertionError = (function() {
        function AssertionError( a ) {
            this.constructor$( a );
            this.message = a;
            this.name = "AssertionError";
        }
        AssertionError.prototype = new Error();
        AssertionError.prototype.constructor = AssertionError;
        AssertionError.prototype.constructor$ = Error;
        return AssertionError;
    })();

    return function assert( boolExpr, message ) {
        if( boolExpr === true ) return;

        var ret = new AssertionError( message );
        if( Error.captureStackTrace ) {
            Error.captureStackTrace( ret, assert );
        }
        if( console && console.error ) {
            console.error( ret.stack + "" );
        }
        throw ret;

    };
})();

var errorObj = {e: {}};
var rescape = /[\r\n\u2028\u2029']/g;

var replacer = function( ch ) {
        return "\\u" + (("0000") +
            (ch.charCodeAt(0).toString(16))).slice(-4);
};

function safeToEmbedString( str ) {
    return str.replace( rescape, replacer );
}

function tryCatch1( fn, receiver, arg ) {
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    try {
        return fn.call( receiver, arg );
    }
    catch( e ) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatch2( fn, receiver, arg, arg2 ) {
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    try {
        return fn.call( receiver, arg, arg2 );
    }
    catch( e ) {
        errorObj.e = e;
        return errorObj;
    }
}

function tryCatchApply( fn, args ) {
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    try {
        return fn.apply( void 0, args );
    }
    catch( e ) {
        errorObj.e = e;
        return errorObj;
    }
}

var create = Object.create || function( proto ) {
    function F(){}
    F.prototype = proto;
    return new F();
};

function makeNodePromisified( callback, receiver ) {

    function getCall(count) {
        var args = new Array(count);
        for( var i = 0, len = args.length; i < len; ++i ) {
            args[i] = "a" + (i+1);
        }
        var comma = count > 0 ? "," : "";
        return ( receiver === void 0
            ? "callback("+args.join(",")+ comma +" fn);"
            : "callback.call(receiver, "+args.join(",") + comma + " fn);" ) +
        "break;";
    }

    return new Function("Promise", "callback", "receiver",
        "return function promisified( a1, a2, a3, a4, a5 ) {\"use strict\";" +
        "var len = arguments.length;" +
        "var resolver = Promise.pending( promisified );" +
        "" +
        "var fn = function fn( err, value ) {" +
        "if( err ) {" +
        "resolver.reject( err );" +
        "}" +
        "else {" +
        "resolver.fulfill( value );" +
        "}" +
        "};" +
        "switch( len ) {" +
        "case 5:" + getCall(5) +
        "case 4:" + getCall(4) +
        "case 3:" + getCall(3) +
        "case 2:" + getCall(2) +
        "case 1:" + getCall(1) +
        "case 0:" + getCall(0) +
        "default: callback.apply(receiver, arguments); break;" +
        "}" +
        "return resolver.promise;" +
        "" +
        "};"
    )(Promise, callback, receiver);
}


var inherits = function( Child, Parent ) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call( Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
            ) {
                this[ propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};

function subError( constructorName, nameProperty, defaultMessage ) {
    defaultMessage = safeToEmbedString("" + defaultMessage );
    nameProperty = safeToEmbedString("" + nameProperty );

    return new Function("create", "'use strict';\n" +
         constructorName + ".prototype = create(Error.prototype);" +
         constructorName + ".prototype.constructor = "+constructorName+";" +
        "function "+constructorName+"(msg){" +
        "if( Error.captureStackTrace ) {" +
        "Error.captureStackTrace(this, this.constructor);" +
        "}" +
        "Error.call(this, msg);" +
        "this.message = typeof msg === 'string'" +
        "? msg" +
        ": '"+defaultMessage+"';" +
        "this.name = '"+nameProperty+"';" +
        "} return "+constructorName+";")(create);
}

if( typeof global.TypeError === "undefined" ) {
    global.TypeError = subError( "TypeError", "TypeError" );
}
var CancellationError = subError( "CancellationError",
    "Cancel", "cancellation error" );
var TimeoutError = subError( "TimeoutError", "Timeout", "timeout error" );


var CapturedTrace = (function() {

var rignore = new RegExp(
    "\\b(?:Promise(?:Array)?\\$_\\w+|tryCatch(?:1|2|Apply)|setTimeout" +
    "|makeNodePromisified|processImmediate|nextTick" +
    "|Async\\$\\w+)\\b"
);

var rtraceline = null;
var formatStack = null;

function CapturedTrace( ignoreUntil ) {
    ASSERT(((typeof ignoreUntil) === "function"),
    "typeof ignoreUntil === \u0022function\u0022");
    ASSERT(((typeof ignoreUntil.name) === "string"),
    "typeof ignoreUntil.name === \u0022string\u0022");
    ASSERT((ignoreUntil.name.length > 0),
    "ignoreUntil.name.length > 0");
    this.captureStackTrace( ignoreUntil );
}
var method = inherits( CapturedTrace, Error );

method.captureStackTrace =
function CapturedTrace$captureStackTrace( ignoreUntil ) {
    captureStackTrace( this, ignoreUntil );
};

CapturedTrace.possiblyUnhandledRejection =
function CapturedTrace$PossiblyUnhandledRejection( reason ) {
    if( typeof console === "object" ) {
        var stack = reason.stack;
        var message = "Possibly unhandled " + formatStack( stack, reason );
        if( typeof console.error === "function" ) {
            console.error( message );
        }
        else if( typeof console.log === "function" ) {
            console.log( message );
        }
    }
};

CapturedTrace.combine = function CapturedTrace$Combine( current, prev ) {
    var curLast = current.length - 1;
    for( var i = prev.length - 1; i >= 0; --i ) {
        var line = prev[i];
        if( current[ curLast ] === line ) {
            current.pop();
            curLast--;
        }
        else {
            break;
        }
    }
    var lines = current.concat( prev );

    var ret = [];


    for( var i = 0, len = lines.length; i < len; ++i ) {
        if( rignore.test( lines[i] ) ||
            ( i > 0 && !rtraceline.test( lines[i] ) )
        ) {
            continue;
        }
        ret.push( lines[i] );
    }
    return ret;
};

CapturedTrace.isSupported = function CapturedTrace$IsSupported() {
    return typeof captureStackTrace === "function";
};

var captureStackTrace = (function stackDetection() {
    if( typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function" ) {
        rtraceline = /^\s*at\s*/;
        formatStack = function( stack, error ) {
            return ( typeof stack === "string" )
                ? stack
                : error.name + ". " + error.message;
        };
        return Error.captureStackTrace;
    }
    var err = new Error();

    if( typeof err.stack === "string" &&
        typeof "".startsWith === "function" &&
        ( err.stack.startsWith("stackDetection@")) &&
        stackDetection.name === "stackDetection" ) {

        Object.defineProperty( Error, "stackTraceLimit", {
            writable: true,
            enumerable: false,
            configurable: false,
            value: 25
        });
        rtraceline = /@/;
        var rline = /[@\n]/;

        formatStack = function( stack, error ) {
            return ( typeof stack === "string" )
                ? ( error.name + ". " + error.message + "\n" + stack )
                : ( error.name + ". " + error.message );
        };

        return function captureStackTrace(o, fn) {
            var name = fn.name;
            var stack = new Error().stack;
            var split = stack.split( rline );
            var i, len = split.length;
            for (i = 0; i < len; i += 2) {
                if (split[i] === name) {
                    break;
                }
            }
            ASSERT(((i + 2) < split.length),
    "i + 2 < split.length");
            split = split.slice(i + 2);
            len = split.length - 2;
            var ret = "";
            for (i = 0; i < len; i += 2) {
                ret += split[i];
                ret += "@";
                ret += split[i + 1];
                ret += "\n";
            }
            o.stack = ret;
        };
    }
    else {
        return null;
    }
})();

return CapturedTrace;})();

function GetterCache(){}
function FunctionCache(){}


var getterCache = new GetterCache(),
    functionCache = new FunctionCache(),
    rjsident = /^[a-zA-Z$_][a-zA-Z0-9$_]*$/,
    rkeyword = new RegExp(
        "^(?:__proto__|undefined|NaN|Infinity|this|false|true|null|eval|" +
        "arguments|break|case|catch|continue|debugger|default|delete|do|" +
        "else|finally|for|function|if|in|instanceof|new|return|switch|th" +
        "row|try|typeof|var|void|while|with|class|enum|export|extends|im" +
        "port|super|implements|interface|let|package|private|protected|pu" +
        "blic|static|yield)$"
    ),
    hasProp = {}.hasOwnProperty;



function isJsIdentifier( val ) {
    return rjsident.test(val) &&
        !rkeyword.test(val);
}

function formatPropertyRead( val ) {
    if( isJsIdentifier(val) ) {
        return "." + val;
    }
    else {
        return "['"+safeToEmbedString(val)+"']";
    }
}

function getGetter( propertyName ) {
    if( hasProp.call( getterCache, propertyName ) ) {
        return getterCache[propertyName];
    }
    var fn = new Function("obj", "return obj"+
        formatPropertyRead(""+propertyName)
    +";");
    getterCache[propertyName] = fn;
    return fn;
}

function getFunction( propertyName ) {
    if( hasProp.call( functionCache, propertyName ) ) {
        return functionCache[propertyName];
    }
    var fn = new Function("obj", "return obj"+
        formatPropertyRead(""+propertyName)
    +"();");
    functionCache[propertyName] = fn;
    return fn;
}
var Async = (function() {

var deferFn = typeof process !== "undefined" ?
    ( typeof global.setImmediate !== "undefined"
        ? function( fn ){
            global.setImmediate( fn );
          }
        : function( fn ) {
            process.nextTick( fn );
        }

    ) :
    ( typeof setTimeout !== "undefined"
        ? function( fn ) {
            setTimeout( fn, 4 );
        }
        : function( fn ) {
            fn();
        }
) ;

function Async() {
    this._isTickUsed = false;
    this._length = 0;
    this._backupBuffer = [];
    var functionBuffer = this._functionBuffer =
        new Array( 1000 * 3 );
    var self = this;
    this.consumeFunctionBuffer = function Async$consumeFunctionBuffer() {
        self._consumeFunctionBuffer();
    };

    for( var i = 0, len = functionBuffer.length; i < len; ++i ) {
        functionBuffer[i] = void 0;
    }
}
var method = Async.prototype;

method.haveItemsQueued = function Async$haveItemsQueued() {
    return this._length > 0;
};

method.invokeLater = function Async$invokeLater( fn, receiver, arg ) {
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    ASSERT((arguments.length === 3),
    "arguments.length === 3");
    this._backupBuffer.push( fn, receiver, arg );
    if( !this._isTickUsed ) {
        deferFn( this.consumeFunctionBuffer );
        this._isTickUsed = true;
    }
};

method.invoke = function Async$invoke( fn, receiver, arg ) {
    ASSERT(((typeof fn) === "function"),
    "typeof fn === \u0022function\u0022");
    ASSERT((arguments.length === 3),
    "arguments.length === 3");
    var functionBuffer = this._functionBuffer,
        len = functionBuffer.length,
        length = this._length;

    if( length === len ) {
        functionBuffer.push( fn, receiver, arg );
    }
    else {
        ASSERT((length < len),
    "length < len");
        functionBuffer[ length + 0 ] = fn;
        functionBuffer[ length + 1 ] = receiver;
        functionBuffer[ length + 2 ] = arg;
    }
    this._length = length + 3;

    if( !this._isTickUsed ) {
        deferFn( this.consumeFunctionBuffer );
        this._isTickUsed = true;
    }
};

method._consumeFunctionBuffer = function Async$_consumeFunctionBuffer() {
    var functionBuffer = this._functionBuffer;
    ASSERT(this._isTickUsed,
    "this._isTickUsed");
    for( var i = 0; i < this._length; i += 3 ) {
        functionBuffer[ i + 0 ].call(
            functionBuffer[ i + 1 ],
            functionBuffer[ i + 2 ] );

        functionBuffer[ i + 0 ] =
            functionBuffer[ i + 1 ] =
            functionBuffer[ i + 2 ] =
            void 0;
    }
    this._reset();
    if( this._backupBuffer.length ) {
        var buffer = this._backupBuffer;
        for( var i = 0; i < buffer.length; i+= 3 ) {
            buffer[ i + 0 ].call(
                buffer[ i + 1 ] ,
                buffer[ i + 2 ] );
        }
        buffer.length = 0;
    }
};

method._reset = function Async$_reset() {
    this._isTickUsed = false;
    this._length = 0;
};


return Async;})();

var async = new Async();
var Thenable = (function() {

function Thenable() {
    this.errorObj = errorObj;
    this.__id__ = 0;
    this.treshold = 1000;
    this.thenableCache = new Array( this.treshold );
    this.promiseCache = new Array( this.treshold );
    this._compactQueued = false;
}
var method = Thenable.prototype;

method.couldBe = function Thenable$couldBe( ret ) {
    if( ret === null ||
        typeof ret === "undefined" ||
        typeof ret === "string" ||
        typeof ret === "boolean" ||
        typeof ret === "number" ) {
        return false;
    }
    var id = ret.__id_$thenable__;
    if( typeof id === "number" &&
        this.thenableCache[id] !== void 0 ) {
        return true;
    }
    return ("then" in ret);
};

method.is = function Thenable$is( ret, ref ) {
    var id = ret.__id_$thenable__;
    if( typeof id === "number" &&
        this.thenableCache[id] !== void 0 ) {
        ref.ref = this.thenableCache[id];
        ref.promise = this.promiseCache[id];
        return true;
    }
    return this._thenableSlowCase( ret, ref );
};

method.addCache = function Thenable$_addCache( thenable, promise ) {
    var id = this.__id__;
    this.__id__ = id + 1;
    var descriptor = this._descriptor( id );
    Object.defineProperty( thenable, "__id_$thenable__", descriptor );
    this.thenableCache[id] = thenable;
    this.promiseCache[id] = promise;
    ASSERT((this.thenableCache[thenable.__id_$thenable__] === thenable),
    "this.thenableCache[ thenable.__id_$thenable__ ] === thenable");
    if( this.thenableCache.length > this.treshold &&
        !this._compactQueued) {
        this._compactQueued = true;
        async.invokeLater( this._compactCache, this, void 0 );
    }
};

method.deleteCache = function Thenable$deleteCache( thenable ) {
    var id = thenable.__id_$thenable__;
    ASSERT(((typeof id) === "number"),
    "typeof id === \u0022number\u0022");
    ASSERT(((id | 0) === id),
    "(id | 0) === id");
    if( id === -1 ) {
        return;
    }
    ASSERT((id > -1),
    "id > -1");
    ASSERT((id < this.__id__),
    "id < this.__id__");
    ASSERT((this.thenableCache[id] === thenable),
    "this.thenableCache[id] === thenable");
    this.thenableCache[id] = void 0;
    this.promiseCache[id] = void 0;
    thenable.__id_$thenable__ = -1;};

var descriptor = {
    value: 0,
    enumerable: false,
    writable: true,
    configurable: true
};
method._descriptor = function Thenable$_descriptor( id ) {
    descriptor.value = id;
    return descriptor;
};

method._compactCache = function Thenable$_compactCache() {
    var arr = this.thenableCache;
    var promiseArr = this.promiseCache;
    var skips = 0;
    var j = 0;
    for( var i = 0, len = arr.length; i < len; ++i ) {
        var item = arr[ i ];
        if( item === void 0 ) {
            skips++;
        }
        else {
            promiseArr[ j ] = promiseArr[ i ];
            item.__id_$thenable__ = j;
            arr[ j++ ] = item;
        }
    }
    var newId = arr.length - skips;
    if( newId === this.__id__ ) {
        this.treshold *= 2;
    }
    else for( var i = newId, len = arr.length; i < len; ++i ) {
        promiseArr[ j ] = arr[i] = void 0;
    }

    this.__id__ = newId;
    this._compactQueued = false;
};

method._thenableSlowCase = function Thenable$_thenableSlowCase( ret, ref ) {
    try {
        var then = ret.then;
        if( typeof then === "function" ) {
            ref.ref = then;
            return true;
        }
        return false;
    }
    catch(e) {
        this.errorObj.e = e;
        ref.ref = this.errorObj;
        return true;
    }
};




return Thenable;})();
var CatchFilter = (function() {

function CatchFilter( instances, callback ) {
    this._instances = instances;
    this._callback = callback;
}
var method = CatchFilter.prototype;

method.doFilter = function( e ) {
    if( e === null || typeof e !== "object" ) {
        throw e;
    }
    var cb = this._callback;
    for( var i = 0, len = this._instances.length; i < len; ++i ) {
        var item = this._instances[i];
        if( e instanceof item ) {
            var ret = tryCatch1( cb, void 0, e );
            if( ret === errorObj ) {
                throw ret.e;
            }
            return ret;
        }
    }
    throw e;
};

return CatchFilter;})();
var Promise = (function() {

function isObject( value ) {
    if( value === null ) {
        return false;
    }
    return ( typeof value === "object" ||
            typeof value === "function" );
}

function isPromise( obj ) {
    if( typeof obj !== "object" ) return false;
    return obj instanceof Promise;
}

var Err = Error;
function isError( obj ) {
    if( typeof obj !== "object" ) return false;
    return obj instanceof Err;
}

var Arr = Array;
var isArray = Arr.isArray || function( obj ) {
    return obj instanceof Arr;
};


var APPLY = {};
var thenable = new Thenable( errorObj );

function Promise( resolver ) {
    if( typeof resolver === "function" )
        this._resolveResolver( resolver );


    this._bitField = 67108864;
    this._fulfill0 = void 0;
    this._reject0 = void 0;
    this._progress0 = void 0;
    this._promise0 = void 0;
    this._receiver0 = void 0;
    this._resolvedValue = void 0;
    this._cancellationParent = void 0;
    if( longStackTraces ) this._traceParent = this._peekContext();
}

var method = Promise.prototype;

var longStackTraces = true;
Promise.longStackTraces = function() {
    if( async.haveItemsQueued() &&
        longStackTraces === false
    ) {
        throw new Error("Cannot enable long stack traces " +
        "after promises have been created");
    }
    longStackTraces = true;
};

method._setTrace = function _setTrace( fn ) {
    ASSERT((this._trace == null),
    "this._trace == null");
    if( longStackTraces ) {
        this._trace = new CapturedTrace(
            typeof fn === "function"
            ? fn
            : _setTrace
        );
    }
    return this;
};

method.toString = function Promise$toString() {
    return "[object Promise]";
};


method.caught = method["catch"] = function Promise$catch( fn ) {
    var len = arguments.length;
    if( len > 1 ) {
        var catchInstances = new Array( len - 1 ),
            j = 0, i;
        for( i = 0; i < len - 1; ++i ) {
            var item = arguments[i];
            if( typeof item === "function" &&
                ( item.prototype instanceof Error ||
                item === Error ) ) {
                catchInstances[j++] = item;
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        var catchFilter = new CatchFilter( catchInstances, fn );
        return this._then( void 0, catchFilter.doFilter, void 0,
            catchFilter, void 0, this.caught );
    }
    return this._then( void 0, fn, void 0, void 0, void 0, this.caught );
};

method.progressed = function Promise$progressed( fn ) {
    return this._then( void 0, void 0, fn, void 0, void 0, this.progressed );
};


function thrower( r ) {
    throw r;
}
function slowFinally( ret, reasonOrValue ) {
    if( this.isFulfilled() ) {
        return ret._then(function() {
            return reasonOrValue;
        }, thrower, void 0, this, void 0, slowFinally );
    }
    else {
        return ret._then(function() {
            throw reasonOrValue;
        }, thrower, void 0, this, void 0, slowFinally );
    }
}
method.lastly = method["finally"] = function Promise$finally( fn ) {
    var r = function( reasonOrValue ) {
        var ret = fn( reasonOrValue );
        if( isPromise( ret ) ) {
            return slowFinally.call( this, ret, reasonOrValue );
        }
        if( this.isRejected() ) throw reasonOrValue;
        return reasonOrValue;
    };
    return this._then( r, r, void 0, this, void 0, this.anyway );
};

method.inspect = function Promise$inspect() {
    return new PromiseInspection( this );
};

method.cancel = function Promise$cancel() {
    if( !this.isCancellable() ) return this;
    var cancelTarget = this;
    while( cancelTarget._cancellationParent !== void 0 ) {
        cancelTarget = cancelTarget._cancellationParent;
    }
    if( cancelTarget === this ) {
        var err = new CancellationError();
        this._attachExtraTrace( err );
        async.invoke( this._reject, this, err );
    }
    else {
        async.invoke( cancelTarget.cancel, cancelTarget, void 0 );
    }
    return this;
};

method.uncancellable = function Promise$uncancellable() {
    var ret = new Promise();
    ret._setTrace();
    ret._unsetCancellable();
    ret._assumeStateOf( this, true );
    return ret;
};

method.fork = function Promise$fork( didFulfill, didReject, didProgress ) {
    var ret = this._then( didFulfill, didReject, didProgress,
        void 0, void 0, this.fork );
    ret._cancellationParent = void 0;
    return ret;
};

method.call = function Promise$call( propertyName ) {
    var len = arguments.length;

    if( len < 2 ) {
        return this._callFast( propertyName );
    }
    else {
        var args = new Array(len-1);
        for( var i = 1; i < len; ++i ) {
            args[ i - 1 ] = arguments[ i ];
        }
        return this._callSlow( propertyName, args );
    }

};

method.get = function Promise$get( propertyName ) {
    return this._then(
        getGetter( propertyName ),
        void 0,
        void 0,
        void 0,
        void 0,
        this.get
    );
};

method.then = function Promise$then( didFulfill, didReject, didProgress ) {
    return this._then( didFulfill, didReject, didProgress,
        void 0, void 0, this.then );
};

method.spread = function Promise$spread( didFulfill, didReject ) {
    return this._then( didFulfill, didReject, void 0,
        APPLY, void 0, this.spread );
};
method.isFulfilled = function Promise$isFulfilled() {
    return ( this._bitField & 268435456 ) > 0;
};

method.isRejected = function Promise$isRejected() {
    return ( this._bitField & 134217728 ) > 0;
};

method.isPending = function Promise$isPending() {
    return !this.isResolved();
};

method.isResolved = function Promise$isResolved() {
    return ( this._bitField & 402653184 ) > 0;
};

method.isCancellable = function Promise$isCancellable() {
    return !this.isResolved() &&
        this._cancellable();
};

method.toJSON = function Promise$toJSON() {
    var inspection = this.inspect();
    var ret = {
        isFulfilled: false,
        isRejected: false
    };
    if( inspection.isFulfilled() ) {
        ret.fulfillmentValue = inspection.value();
        ret.isFulfilled = true;
    }
    else if( inspection.isRejected() ) {
        ret.rejectionReason = inspection.error();
        ret.isRejected = true;
    }
    return ret;
};

method.map = function Promise$map( fn ) {
    return Promise.map( this, fn );
};

method.all = function Promise$all() {
    return Promise.all( this );
};

method.any = function Promise$any() {
    return Promise.any( this );
};

method.settle = function Promise$settle() {
    return Promise.settle( this );
};

method.some = function Promise$some( count ) {
    return Promise.some( this, count );
};

method.reduce = function Promise$reduce( fn, initialValue ) {
    return Promise.reduce( this, fn, initialValue );
};

Promise.is = isPromise;

Promise.settle = function Promise$Settle( promises ) {
    var ret = Promise._all( promises, SettledPromiseArray );
    return ret.promise();
};

Promise.all = function Promise$All( promises ) {
    var ret = Promise._all( promises, PromiseArray );
    return ret.promise();
};

Promise.join = function Promise$Join() {
    var ret = new Array( arguments.length );
    for( var i = 0, len = ret.length; i < len; ++i ) {
        ret[i] = arguments[i];
    }
    return Promise._all( ret, PromiseArray ).promise();
};

Promise.any = function Promise$Any( promises ) {
    var ret = Promise._all( promises, AnyPromiseArray );
    return ret.promise();
};

Promise.some = function Promise$Some( promises, howMany ) {
    var ret = Promise._all( promises, SomePromiseArray );
    if( ( howMany | 0 ) !== howMany ) {
        throw new TypeError("howMany must be an integer");
    }
    var len = ret.length();
    howMany = Math.max(0, Math.min( howMany, len ) );
    ret._howMany = howMany;
    return ret.promise();
};


function mapper( fulfilleds ) {
    var fn = this;
    var shouldDefer = false;
    for( var i = 0, len = fulfilleds.length; i < len; ++i ) {
        var fulfill = fn(fulfilleds[i]);
        if( !shouldDefer && isPromise( fulfill ) ) {
            if( fulfill.isFulfilled() ) {
                fulfilleds[i] = fulfill._resolvedValue;
                continue;
            }
            else {
                shouldDefer = true;
            }
        }
        fulfilleds[i] = fulfill;
    }
    return shouldDefer ? Promise.all( fulfilleds ) : fulfilleds;
}
Promise.map = function Promise$Map( promises, fn ) {
    if( typeof fn !== "function" )
        throw new TypeError( "fn is not a function" );
    return Promise.all( promises )._then(
        mapper,
        void 0,
        void 0,
        fn,
        void 0,
        Promise.all
    );
};

function reducer( fulfilleds, initialValue ) {
    var fn = this;
    var len = fulfilleds.length;
    var accum;
    var startIndex = 0;

    if( initialValue !== void 0 ) {
        accum = initialValue;
        startIndex = 0;
    }
    else {
        accum = len > 0 ? fulfilleds[0] : void 0;
        startIndex = 1;
    }
    for( var i = startIndex; i < len; ++i ) {
        accum = fn( accum, fulfilleds[i], i, len );
    }
    return accum;
}

function slowReduce( promises, fn, initialValue ) {
    return Promise._all( promises, PromiseArray, slowReduce )
        .promise()
        .then( function( fulfilleds ) {
            return reducer.call( fn, fulfilleds, initialValue );
        });
}


Promise.reduce = function Promise$Reduce( promises, fn, initialValue ) {
    if( typeof fn !== "function" )
        throw new TypeError( "fn is not a function");
    if( initialValue !== void 0 ) {
        return slowReduce( promises, fn, initialValue );
    }
    return Promise
        .all( promises )
        ._then( reducer, void 0, void 0, fn, void 0, Promise.all );
};

Promise.fulfilled = function Promise$Fulfilled( value ) {
    var ret = new Promise();
    ret._setTrace();
    if( ret._tryAssumeStateOf( value, false ) ) {
        return ret;
    }
    ret._cleanValues();
    ret._setFulfilled();
    ret._resolvedValue = value;
    return ret;
};

Promise.rejected = function Promise$Rejected( reason ) {
    var ret = new Promise();
    ret._setTrace();
    ret._cleanValues();
    ret._setRejected();
    ret._resolvedValue = reason;
    return ret;
};

Promise.pending = function Promise$Pending( caller ) {
    var promise = new Promise();
    promise._setTrace( caller );
    return new PromiseResolver( promise );
};


Promise.cast = function Promise$Cast( obj ) {
    var ret = cast( obj );
    if( !( ret instanceof Promise ) ) {
        return Promise.fulfilled( ret );
    }
    return ret;
};

Promise.onPossiblyUnhandledRejection =
function Promise$OnPossiblyUnhandledRejection( fn ) {
    if( typeof fn === "function" ) {
        CapturedTrace.possiblyUnhandledRejection = fn;
    }
    else {
        CapturedTrace.possiblyUnhandledRejection = void 0;
    }
};

Promise.promisify = function Promise$Promisify( callback, receiver) {
    return makeNodePromisified( callback, receiver );
};

method._then =
function Promise$_then(
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData,
    caller
) {
    var haveInternalData = internalData !== void 0;
    var ret = haveInternalData ? internalData : new Promise();

    if( longStackTraces && !haveInternalData ) {
        ret._traceParent = this;
        ret._setTrace( typeof caller === "function" ? caller : this._then );
    }

    var callbackIndex =
        this._addCallbacks( didFulfill, didReject, didProgress, ret, receiver );

    if( this.isResolved() ) {
        async.invoke( this._resolveLast, this, callbackIndex );
    }
    else if( !haveInternalData && this.isCancellable() ) {
        ret._cancellationParent = this;
    }

    if( this._isDelegated() ) {
        this._unsetDelegated();
        ASSERT((! this.isResolved()),
    "!this.isResolved()");
        var x = this._resolvedValue;
        if( !this._tryThenable( x ) ) {
            async.invoke( this._fulfill, this, x );
        }
    }
    return ret;
};

method._length = function Promise$_length() {
    ASSERT(isPromise(this),
    "isPromise( this )");
    ASSERT((arguments.length === 0),
    "arguments.length === 0");
    return this._bitField & 16777215;
};

method._isFollowingOrFulfilledOrRejected =
function Promise$_isFollowingOrFulfilledOrRejected() {
    return ( this._bitField & 939524096 ) > 0;
};

method._setLength = function Promise$_setLength( len ) {
    this._bitField = ( this._bitField & -16777216 ) |
        ( len & 16777215 ) ;
};

method._cancellable = function Promise$_cancellable() {
    return ( this._bitField & 67108864 ) > 0;
};

method._setFulfilled = function Promise$_setFulfilled() {
    this._bitField = this._bitField | 268435456;
};

method._setRejected = function Promise$_setRejected() {
    this._bitField = this._bitField | 134217728;
};

method._setFollowing = function Promise$_setFollowing() {
    this._bitField = this._bitField | 536870912;
};

method._setDelegated = function Promise$_setDelegated() {
    this._bitField = this._bitField | -1073741824;

};

method._isDelegated = function Promise$_isDelegated() {
    return ( this._bitField & -1073741824 ) === -1073741824;
};

method._unsetDelegated = function Promise$_unsetDelegated() {
    this._bitField = this._bitField & ( ~-1073741824 );
};

method._setCancellable = function Promise$_setCancellable() {
    this._bitField = this._bitField | 67108864;
};

method._unsetCancellable = function Promise$_unsetCancellable() {
    this._bitField = this._bitField & ( ~67108864 );
};

method._receiverAt = function Promise$_receiverAt( index ) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT((index >= 0),
    "index >= 0");
    ASSERT((index < this._length()),
    "index < this._length()");
    ASSERT(((index % 5) === 0),
    "index % CALLBACK_SIZE === 0");
    if( index === 0 ) return this._receiver0;
    return this[ index + 4 - 5 ];
};

method._promiseAt = function Promise$_promiseAt( index ) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT((index >= 0),
    "index >= 0");
    ASSERT((index < this._length()),
    "index < this._length()");
    ASSERT(((index % 5) === 0),
    "index % CALLBACK_SIZE === 0");
    if( index === 0 ) return this._promise0;
    return this[ index + 3 - 5 ];
};

method._fulfillAt = function Promise$_fulfillAt( index ) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT((index >= 0),
    "index >= 0");
    ASSERT((index < this._length()),
    "index < this._length()");
    ASSERT(((index % 5) === 0),
    "index % CALLBACK_SIZE === 0");
    if( index === 0 ) return this._fulfill0;
    return this[ index + 0 - 5 ];
};

method._rejectAt = function Promise$_rejectAt( index ) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT((index >= 0),
    "index >= 0");
    ASSERT((index < this._length()),
    "index < this._length()");
    ASSERT(((index % 5) === 0),
    "index % CALLBACK_SIZE === 0");
    if( index === 0 ) return this._reject0;
    return this[ index + 1 - 5 ];
};

method._progressAt = function Promise$_progressAt( index ) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT((index >= 0),
    "index >= 0");
    ASSERT((index < this._length()),
    "index < this._length()");
    ASSERT(((index % 5) === 0),
    "index % CALLBACK_SIZE === 0");
    if( index === 0 ) return this._progress0;
    return this[ index + 2 - 5 ];
};

var fulfiller = new Function("p",
    "'use strict';return function Promise$_fulfiller(a){ p.fulfill( a ); }" );
var rejecter = new Function("p",
    "'use strict';return function Promise$_rejecter(a){ p.reject( a ); }" );

method._resolveResolver = function Promise$_resolveResolver( resolver ) {
    ASSERT(((typeof resolver) === "function"),
    "typeof resolver === \u0022function\u0022");
    this._setTrace( this._resolveResolver );
    var p = new PromiseResolver( this );
    this._pushContext();
    var r = tryCatch2( resolver, this, fulfiller( p ), rejecter( p ) );
    this._popContext();
    if( r === errorObj ) {
        p.reject( r.e );
    }
};

method._addCallbacks = function Promise$_addCallbacks(
    fulfill,
    reject,
    progress,
    promise,
    receiver
) {
    fulfill = typeof fulfill === "function" ? fulfill : void 0;
    reject = typeof reject === "function" ? reject : void 0;
    progress = typeof progress === "function" ? progress : void 0;
    var index = this._length();

    if( index === 0 ) {
        this._fulfill0 = fulfill;
        this._reject0  = reject;
        this._progress0 = progress;
        this._promise0 = promise;
        this._receiver0 = receiver;
        this._setLength( index + 5 );
        return index;
    }

    this[ index - 5 + 0 ] = fulfill;
    this[ index - 5 + 1 ] = reject;
    this[ index - 5 + 2 ] = progress;
    this[ index - 5 + 3 ] = promise;
    this[ index - 5 + 4 ] = receiver;

    this._setLength( index + 5 );
    return index;
};

method._callFast = function Promise$_callFast( propertyName ) {
    return this._then(
        getFunction( propertyName ),
        void 0,
        void 0,
        void 0,
        void 0,
        this.call
    );
};

method._callSlow = function Promise$_callSlow( propertyName, args ) {
    ASSERT(isArray(args),
    "isArray( args )");
    ASSERT((args.length > 0),
    "args.length > 0");
    return this._then( function( obj ) {
        return obj[propertyName].apply( obj, args );
    },
        void 0,
        void 0,
        void 0,
        void 0,
        this.call
    );
};

method._resolveLast = function Promise$_resolveLast( index ) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    ASSERT((index >= 0),
    "index >= 0");
    ASSERT((index < this._length()),
    "index < this._length()");
    var promise = this._promiseAt( index );
    var receiver = this._receiverAt( index );
    var fn;

    if( this.isFulfilled() ) {
        fn = this._fulfillAt( index );
    }
    else if( this.isRejected() ) {
        fn = this._rejectAt( index );
    }
    else unreachable();

    var obj = this._resolvedValue;
    var ret = obj;
    if( fn !== void 0 ) {
        this._resolvePromise( fn, receiver, obj, promise );
    }
    else if( this.isFulfilled() ) {
        promise._fulfill( ret );
    }
    else {
        promise._reject( ret );
    }
};

method._spreadSlowCase =
function Promise$_spreadSlowCase( targetFn, promise, values ) {
    promise._assumeStateOf(
        Promise.all( values )._then( targetFn, void 0, void 0, APPLY, void 0,
            this._spreadSlowCase ),
        false
    );
};


function cast( obj ) {
    if( isObject( obj ) ) {
        if( obj instanceof Promise ) {
            return obj;
        }
        var ref = { ref: null, promise: null };
        if( thenable.is( obj, ref ) ) {
            if( ref.promise != null ) {
                return ref.promise;
            }
            var resolver = Promise.pending();
            var result = ref.ref;
            if( result === errorObj ) {
                resolver.reject( result.e );
                return resolver.promise;
            }
            thenable.addCache( obj, resolver.promise );
            var called = false;
            var ret = tryCatch2( result, obj, function t( a ) {
                if( called ) return;
                called = true;
                async.invoke( thenable.deleteCache, thenable, obj );
                var b = cast( a );
                if( b === a ) {
                    resolver.fulfill( a );
                }
                else {
                    b._then(
                        resolver.fulfill,
                        resolver.reject,
                        void 0,
                        resolver,
                        void 0,
                        t
                    );
                }
            }, function t( a ) {
                if( called ) return;
                called = true;
                async.invoke( thenable.deleteCache, thenable, obj );
                resolver.reject( a );
            });
            if( ret === errorObj && !called ) {
                resolver.reject( ret.e );
                async.invoke( thenable.deleteCache, thenable, obj );
            }
            return resolver.promise;
        }
    }
    return obj;
}

method._resolveThenable = function Promise$_resolveThenable( x, ref ) {
    if( ref.promise != null ) {
        this._assumeStateOf( ref.promise, true );
        return;
    }
    if( ref.ref === errorObj ) {
        this._attachExtraTrace( ref.ref.e );
        async.invoke( this._reject, this, ref.ref.e );
    }
    else {
        thenable.addCache( x, this );
        var then = ref.ref;
        var localX = x;
        var localP = this;
        var key = {};
        var called = false;
        var t = function t( v ) {
            if( called && this !== key ) return;
            called = true;
            var b = cast( v );

            if( b !== v ||
                ( b instanceof Promise && b.isPending() ) ) {
                b._then( t, r, void 0, key, void 0, t);
                return;
            }

            var fn = localP._fulfill;
            if( b instanceof Promise ) {
                var fn = b.isFulfilled()
                    ? localP._fulfill : localP._reject;
                ASSERT(b.isResolved(),
    "b.isResolved()");
                v = v._resolvedValue;
                b = cast( v );
                ASSERT(((b instanceof Promise) || (b === v)),
    "b instanceof Promise || b === v");
                if( b !== v ||
                    ( b instanceof Promise && b !== v ) ) {
                    b._then( t, r, void 0, key, void 0, t);
                    return;
                }
            }
            async.invoke( fn, localP, v );
            async.invoke( thenable.deleteCache,
                    thenable, localX );
        };

        var r = function r( v ) {
            if( called && this !== key ) return;
            called = true;

            var b = cast( v );

            if( b !== v ||
                ( b instanceof Promise && b.isPending() ) ) {
                b._then( t, r, void 0, key, void 0, t);
                return;
            }

            var fn = localP._reject;
            if( b instanceof Promise ) {
                var fn = b.isFulfilled()
                    ? localP._fulfill : localP._reject;
                ASSERT(b.isResolved(),
    "b.isResolved()");
                v = v._resolvedValue;
                b = cast( v );
                if( b !== v ||
                    ( b instanceof Promise && b.isPending() ) ) {
                    b._then( t, r, void 0, key, void 0, t);
                    return;
                }
            }

            async.invoke( fn, localP, v );
            async.invoke( thenable.deleteCache,
                thenable, localX );

        };
        var threw = tryCatch2( then, x, t, r);
        if( threw === errorObj &&
            !called ) {
            this._attachExtraTrace( threw.e );
            async.invoke( this._reject, this, threw.e );
            async.invoke( thenable.deleteCache, thenable, x );
        }
    }
};

method._tryThenable = function Promise$_tryThenable( x ) {
    var ref;
    if( !thenable.is( x, ref = {ref: null, promise: null} ) ) {
        return false;
    }
    this._resolveThenable( x, ref );
    return true;
};

var ignore = CatchFilter.prototype.doFilter;
method._resolvePromise = function Promise$_resolvePromise(
    onFulfilledOrRejected, receiver, value, promise
) {
    if( isError( value ) ) {
        value.__handled = true;
    }

    if( !isPromise( promise ) ) {
        return onFulfilledOrRejected.call( receiver, value, promise );
    }

    var x;
    if( receiver === APPLY ) {
        if( isArray( value ) ) {
            for( var i = 0, len = value.length; i < len; ++i ) {
                if( isPromise( value[i] ) ) {
                    this._spreadSlowCase(
                        onFulfilledOrRejected,
                        promise,
                        value
                    );
                    return;
                }
            }
            promise._pushContext();
            x = tryCatchApply( onFulfilledOrRejected, value );
        }
        else {
            this._spreadSlowCase( onFulfilledOrRejected, promise, value );
            return;
        }
    }
    else {
        promise._pushContext();
        x = tryCatch1( onFulfilledOrRejected, receiver, value );
    }

    promise._popContext();

    if( x === errorObj ) {
        if( onFulfilledOrRejected !== ignore ) {
            promise._attachExtraTrace( x.e );
        }
        async.invoke( promise._reject, promise, x.e );
    }
    else if( x === promise ) {
        async.invoke(
            promise._reject,
            promise,
            new TypeError( "Circular thenable chain" )
        );
    }
    else {
        if( promise._tryAssumeStateOf( x, true ) ) {
            return;
        }
        else if( thenable.couldBe( x ) ) {

            if( promise._length() === 0 ) {
                promise._resolvedValue = x;
                promise._setDelegated();
                return;
            }
            else if( promise._tryThenable( x ) ) {
                return;
            }
        }
        async.invoke( promise._fulfill, promise, x );
    }
};

method._assumeStateOf =
function Promise$_assumeStateOf( promise, mustAsync ) {
    ASSERT(isPromise(promise),
    "isPromise( promise )");
    ASSERT(((typeof mustAsync) === "boolean"),
    "typeof mustAsync === \u0022boolean\u0022");
    ASSERT((this._isFollowingOrFulfilledOrRejected() === false),
    "this._isFollowingOrFulfilledOrRejected() === false");
    this._setFollowing();
    if( promise.isPending() ) {
        if( promise._cancellable()  ) {
            this._cancellationParent = promise;
        }
        promise._then(
            this._resolveFulfill,
            this._resolveReject,
            this._resolveProgress,
            this,
            void 0,
            this._tryAssumeStateOf
        );
    }
    else if( promise.isFulfilled() ) {
        if( mustAsync )
            async.invoke( this._resolveFulfill, this, promise._resolvedValue );
        else
            this._resolveFulfill( promise._resolvedValue );
    }
    else {
        if( mustAsync )
            async.invoke( this._resolveReject, this, promise._resolvedValue );
        else
            this._resolveReject( promise._resolvedValue );
    }

    if( longStackTraces &&
        promise._traceParent == null ) {
        promise._traceParent = this;
    }
};

method._tryAssumeStateOf =
function Promise$_tryAssumeStateOf( value, mustAsync ) {
    if( !isPromise( value ) ||
        this._isFollowingOrFulfilledOrRejected() ) return false;

    this._assumeStateOf( value, mustAsync );
    return true;
};



method._attachExtraTrace = function Promise$_attachExtraTrace( error ) {
    if( longStackTraces &&
        isError( error ) ) {
        var promise = this;
        var stack = error.stack.split("\n");
        var headerLineCount = 1;

        while( promise != null &&
            promise._trace != null ) {
            stack = CapturedTrace.combine(
                stack,
                promise._trace.stack.split( "\n" )
            );
            promise = promise._traceParent;
        }

        var max = Error.stackTraceLimit + headerLineCount;
        var len = stack.length;
        if( len  > max ) {
            stack.length = max;
        }
        if( stack.length <= headerLineCount ) {
            error.stack = "(No stack trace)";
        }
        else {
            error.stack = stack.join("\n");
        }
    }
};

method._notifyUnhandledRejection =
function Promise$_notifyUnhandledRejection( reason ) {
    if( !reason.__handled ) {
        reason.__handled = true;
        CapturedTrace.possiblyUnhandledRejection( reason );
    }
};

method._unhandledRejection = function Promise$_unhandledRejection( reason ) {
    if( !reason.__handled ) {
        async.invokeLater( this._notifyUnhandledRejection, this, reason );
    }
};

method._cleanValues = function Promise$_cleanValues() {
    this._cancellationParent = void 0;
};

method._fulfill = function Promise$_fulfill( value ) {
    if( this._isFollowingOrFulfilledOrRejected() ) return;
    this._resolveFulfill( value );

};

method._reject = function Promise$_reject( reason ) {
    if( this._isFollowingOrFulfilledOrRejected() ) return;
    this._resolveReject( reason );
};

method._progress = function Promise$_progress( progressValue ) {
    if( this._isFollowingOrFulfilledOrRejected() ) return;
    this._resolveProgress( progressValue );

};

method._resolveFulfill = function Promise$_resolveFulfill( value ) {
    ASSERT(this.isPending(),
    "this.isPending()");
    this._cleanValues();
    this._setFulfilled();
    this._resolvedValue = value;
    var len = this._length();
    for( var i = 0; i < len; i+= 5 ) {
        var fn = this._fulfillAt( i );
        var promise = this._promiseAt( i );
        var receiver = this._receiverAt( i );
        if( fn !== void 0 ) {
            this._resolvePromise(
                fn,
                receiver,
                value,
                promise
            );

        }
        else {
            async.invoke( promise._fulfill, promise, value );
        }
    }
};

method._resolveReject = function Promise$_resolveReject( reason ) {
    ASSERT(this.isPending(),
    "this.isPending()");
    this._cleanValues();
    this._setRejected();
    this._resolvedValue = reason;
    var len = this._length();
    var rejectionWasHandled = false;
    for( var i = 0; i < len; i+= 5 ) {
        var fn = this._rejectAt( i );
        var promise = this._promiseAt( i );
        if( fn !== void 0 ) {
            rejectionWasHandled = true;
            this._resolvePromise(
                fn,
                this._receiverAt( i ),
                reason,
                promise
            );
        }
        else {
            if( !rejectionWasHandled )
                rejectionWasHandled = promise._length() > 0;
            async.invoke( promise._reject, promise, reason );
        }
    }
    if( !rejectionWasHandled &&
        isError( reason ) &&
        CapturedTrace.possiblyUnhandledRejection !== void 0

    ) {
        if( reason.__handled !== true ) {
            reason.__handled = false;
            async.invoke(
                this._unhandledRejection,
                this,
                reason
            );
        }
    }

};

method._resolveProgress = function Promise$_resolveProgress( progressValue ) {
    ASSERT(this.isPending(),
    "this.isPending()");
    var len = this._length();
    for( var i = 0; i < len; i += 5 ) {
        var fn = this._progressAt( i );
        var promise = this._promiseAt( i );
        if( !isPromise( promise ) ) {
            fn.call( this._receiverAt( i ), progressValue, promise );
            continue;
        }
        var ret = progressValue;
        if( fn !== void 0 ) {
            this._pushContext();
            ret = tryCatch1( fn, this._receiverAt( i ), progressValue );
            this._popContext();
            if( ret === errorObj ) {
                if( ret.e != null &&
                    ret.e.name === "StopProgressPropagation" ) {
                    ret.e.__handled = true;
                }
                else {
                    promise._attachExtraTrace( ret.e );
                    async.invoke( promise._progress, promise, ret.e );
                }
            }
            else if( isPromise( ret ) ) {
                ret._then( promise._progress, null, null, promise, void 0,
                    this._progress );
            }
            else {
                async.invoke( promise._progress, promise, ret );
            }
        }
        else {
            async.invoke( promise._progress, promise, ret );
        }
    }
};

var contextStack = [];
method._peekContext = function Promise$_peekContext() {
    var lastIndex = contextStack.length - 1;
    if( lastIndex >= 0 ) {
        return contextStack[ lastIndex ];
    }
    return void 0;

};

method._pushContext = function Promise$_pushContext() {
    if( !longStackTraces ) return;
    contextStack.push( this );
};

method._popContext = function Promise$_popContext() {
    if( !longStackTraces ) return;
    contextStack.pop();
};


Promise._all =
function Promise$_All( promises, PromiseArray, caller ) {
    ASSERT(((typeof PromiseArray) === "function"),
    "typeof PromiseArray === \u0022function\u0022");
    if( isPromise( promises ) ||
        isArray( promises ) ) {

        return new PromiseArray( promises,
            typeof caller === "function"
            ? caller
            : Promise$_All
        );
    }
    throw new TypeError("expecting an array or a promise");
};


if( !CapturedTrace.isSupported() ) {
    Promise.longStackTraces = void 0;
    CapturedTrace.possiblyUnhandledRejection = void 0;
    Promise.onPossiblyUnhandledRejection = void 0;
    longStackTraces = false;
}

return Promise;})();



var PromiseArray = (function() {

function nullToUndefined( val ) {
    return val === null
        ? void 0
        : val;
}

var hasOwn = {}.hasOwnProperty;
var empty = [];

function isPromise( obj ) {
    if( typeof obj !== "object" ) return false;
    return obj instanceof Promise;
}

var Arr = Array;
var isArray = Arr.isArray || function( obj ) {
    return obj instanceof Arr;
};

function PromiseArray( values, caller ) {
    this._values = values;
    this._resolver = Promise.pending( caller );
    this._length = 0;
    this._totalResolved = 0;
    this._init( void 0, empty );
}
var method = PromiseArray.prototype;

method.length = function PromiseArray$length() {
    return this._length;
};

method.promise = function PromiseArray$promise() {
    return this._resolver.promise;
};


method._init = function PromiseArray$_init( _, fulfillValueIfEmpty ) {
    var values = this._values;
    if( isPromise( values ) ) {
        if( values.isPending() ) {
            values._then(
                this._init,
                this._reject,
                void 0,
                this,
                fulfillValueIfEmpty,
                this.constructor
            );
            return;
        }
        else if( values.isRejected() ) {
            this._reject( values._resolvedValue );
            return;
        }
        else {
            values = values._resolvedValue;
            if( !isArray( values ) ) {
                this._fulfill( nullToUndefined( fulfillValueIfEmpty ) );
                return;
            }
            this._values = values;
        }

    }
    if( !values.length ) {
        this._fulfill( nullToUndefined( fulfillValueIfEmpty ) );
        return;
    }
    var len = values.length;
    var newLen = len;
    var newValues = new Array( len );
    for( var i = 0; i < len; ++i ) {
        var promise = values[i];

        if( promise === void 0 && !hasOwn.call( values, i ) ) {
            newLen--;
            continue;
        }

        promise = Promise.cast( promise );

        promise._then(
            this._promiseFulfilled,
            this._promiseRejected,
            this._promiseProgressed,

            this,            Integer.get( i ),             this.constructor



        );
        newValues[i] = promise;
    }
    this._values = newValues;
    this._length = newLen;
};

method._isResolved = function PromiseArray$_isResolved() {
    return this._values === null;
};

method._fulfill = function PromiseArray$_fulfill( value ) {
    ASSERT((! this._isResolved()),
    "!this._isResolved()");
    this._values = null;
    this._resolver.fulfill( value );
};

method._reject = function PromiseArray$_reject( reason ) {
    ASSERT((! this._isResolved()),
    "!this._isResolved()");
    this._values = null;
    this._resolver.reject( reason );
};

method._promiseProgressed =
function PromiseArray$_promiseProgressed( progressValue, index ) {
    if( this._isResolved() ) return;
    ASSERT(isArray(this._values),
    "isArray( this._values )");

    this._resolver.progress({
        index: index.valueOf(),
        value: progressValue
    });
};

method._promiseFulfilled =
function PromiseArray$_promiseFulfilled( value, index ) {
    if( this._isResolved() ) return;
    ASSERT(isArray(this._values),
    "isArray( this._values )");
    ASSERT((index instanceof Integer),
    "index instanceof Integer");
    this._values[ index.valueOf() ] = value;
    var totalResolved = ++this._totalResolved;
    if( totalResolved >= this._length ) {
        this._fulfill( this._values );
    }
};

method._promiseRejected =
function PromiseArray$_promiseRejected( reason ) {
    if( this._isResolved() ) return;
    ASSERT(isArray(this._values),
    "isArray( this._values )");
    this._totalResolved++;
    this._reject( reason );
};

function Integer( value ) {
    this._value = value;
}

Integer.prototype.valueOf = function Integer$valueOf() {
    return this._value;
};
Integer.get = function Integer$get( i ) {
    if( i < 256 ) {
        return ints[i];
    }
    return new Integer(i);
};

var ints = [];
for( var i = 0; i < 256; ++i ) {
    ints.push( new Integer(i) );
}





return PromiseArray;})();
var SettledPromiseArray = (function() {
function SettledPromiseArray( values, caller ) {
    this.constructor$( values, caller );
}
var method = inherits( SettledPromiseArray, PromiseArray );



method._promiseResolved =
function SettledPromiseArray$_promiseResolved( index, inspection ) {
    ASSERT(((typeof index) === "number"),
    "typeof index === \u0022number\u0022");
    this._values[ index ] = inspection;
    var totalResolved = ++this._totalResolved;
    if( totalResolved >= this._length ) {
        this._fulfill( this._values );
    }
};

var throwawayPromise = new Promise()._setTrace();
method._promiseFulfilled =
function SettledPromiseArray$_promiseFulfilled( value, index ) {
    if( this._isResolved() ) return;
    var ret = new PromiseInspection( throwawayPromise );
    ret._bitField = 268435456;
    ret._resolvedValue = value;
    this._promiseResolved( index.valueOf(), ret );
};
method._promiseRejected =
function SettledPromiseArray$_promiseRejected( reason, index ) {
    if( this._isResolved() ) return;
    var ret = new PromiseInspection( throwawayPromise );
    ret._bitField = 134217728;
    ret._resolvedValue = reason;
    this._promiseResolved( index.valueOf(), ret );
};

return SettledPromiseArray;})();
var AnyPromiseArray = (function() {
function AnyPromiseArray( values, caller ) {
    this.constructor$( values, caller );
}
var method = inherits( AnyPromiseArray, PromiseArray );

method._init = function AnyPromiseArray$_init() {
    this._init$( void 0, null );
};

method._promiseFulfilled =
function AnyPromiseArray$_promiseFulfilled( value ) {
    if( this._isResolved() ) return;
    ++this._totalResolved;
    this._fulfill( value );

};
method._promiseRejected =
function AnyPromiseArray$_promiseRejected( reason, index ) {
    if( this._isResolved() ) return;
    var totalResolved = ++this._totalResolved;
    this._values[ index.valueOf() ] = reason;
    if( totalResolved >= this._length ) {
        this._reject( this._values );
    }

};

return AnyPromiseArray;})();
var SomePromiseArray = (function() {
function SomePromiseArray( values, caller ) {
    this.constructor$( values, caller );
}
var method = inherits( SomePromiseArray, PromiseArray );



method._init = function SomePromiseArray$_init() {
    this._init$( void 0, [] );
    this._howMany = 0;
    this._rejected = 0;
    this._rejectionValues = new Array( this.length() );
    this._resolutionValues = new Array( this.length() );
    if( this._isResolved() ) return;

    if( this._howMany > this._canPossiblyFulfill()  ) {
        this._reject( [] );
    }
};

method._canPossiblyFulfill =
function SomePromiseArray$_canPossiblyFulfill() {
    return this._totalResolved - this._rejected +
        ( this.length() - this._totalResolved );
};

method._promiseFulfilled =
function SomePromiseArray$_promiseFulfilled( value ) {
    if( this._isResolved() ) return;

    var totalResolved = this._totalResolved;
    this._resolutionValues[ totalResolved ] = value;
    this._totalResolved = totalResolved + 1;
    if( totalResolved + 1 === this._howMany ) {
        this._resolutionValues.length = this._howMany;
        this._fulfill( this._resolutionValues );
        this._resolutionValues =
            this._rejectionValues = null;
    }

};
method._promiseRejected =
function SomePromiseArray$_promiseRejected( reason ) {
    if( this._isResolved() ) return;

    this._rejectionValues[ this._rejected ] = reason;
    this._rejected++;
    this._totalResolved++;

    if( this._howMany > this._canPossiblyFulfill() ) {
        this._rejectionValues.length = this._rejected;
        this._reject( this._rejectionValues );
        this._resolutionValues =
            this._rejectionValues = null;
    }
};

return SomePromiseArray;})();
var PromiseInspection = (function() {


function PromiseInspection( promise ) {
    this._bitField = promise._bitField;
    this._resolvedValue = promise.isResolved()
        ? promise._resolvedValue
        : void 0;
}
var method = PromiseInspection.prototype;

method.isFulfilled = function PromiseInspection$isFulfilled() {
    return ( this._bitField & 268435456 ) > 0;
};

method.isRejected = function PromiseInspection$isRejected() {
    return ( this._bitField & 134217728 ) > 0;
};

method.isPending = function PromiseInspection$isPending() {
    return ( this._bitField & 402653184 ) === 0;
};

method.value = function PromiseInspection$value() {
    if( !this.isFulfilled() ) {
        throw new TypeError(
            "cannot get fulfillment value of a non-fulfilled promise");
    }
    return this._resolvedValue;
};

method.error = function PromiseInspection$error() {
    if( !this.isRejected() ) {
        throw new TypeError(
            "cannot get rejection reason of a non-rejected promise");
    }
    return this._resolvedValue;
};




return PromiseInspection;})();

var PromiseResolver = (function() {

function PromiseResolver( promise ) {
    this.promise = promise;
}
var method = PromiseResolver.prototype;

method.toString = function PromiseResolver$toString() {
    return "[object PromiseResolver]";
};

method.fulfill = function PromiseResolver$fulfill( value ) {
    if( this.promise._tryAssumeStateOf( value, false ) ) {
        return;
    }
    async.invoke( this.promise._fulfill, this.promise, value );
};

method.reject = function PromiseResolver$reject( reason ) {
    this.promise._attachExtraTrace( reason );
    async.invoke( this.promise._reject, this.promise, reason );
};

method.progress = function PromiseResolver$progress( value ) {
    async.invoke( this.promise._progress, this.promise, value );
};

method.cancel = function PromiseResolver$cancel() {
    async.invoke( this.promise.cancel, this.promise, void 0 );
};

method.timeout = function PromiseResolver$timeout() {
    this.reject( new TimeoutError( "timeout" ) );
};

method.isResolved = function PromiseResolver$isResolved() {
    return this.promise.isResolved();
};

method.toJSON = function PromiseResolver$toJSON() {
    return this.promise.toJSON();
};


return PromiseResolver;})();
if( typeof module !== "undefined" && module.exports ) {
    module.exports = Promise;
}
else if( typeof define === "function" && define.amd ) {
    define( "Promise", [], function(){return Promise;});
}
else {
    global.Promise = Promise;
}


return Promise;})(
    new Function("return this")(),
    Function,
    Array,
    Error,
    Object
);

},{"__browserify_process":16}],108:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

// This module exports some valid rejection reason factories, keyed by human-readable versions of their names.

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;

var dummy = { dummy: "dummy" };

exports["`undefined`"] = function () {
    return undefined;
};

exports["`null`"] = function () {
    return null;
};

exports["`false`"] = function () {
    return false;
};

exports["`0`"] = function () {
    return 0;
};

exports["an error"] = function () {
    return new Error();
};

exports["an error without a stack"] = function () {
    var error = new Error();
    delete error.stack;

    return error;
};

exports["a date"] = function () {
    return new Date();
};

exports["an object"] = function () {
    return {};
};

exports["an always-pending thenable"] = function () {
    return { then: function () { } };
};

exports["a fulfilled promise"] = function () {
    return fulfilled(dummy);
};

exports["a rejected promise"] = function () {
    return rejected(dummy);
};

},{}],109:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

exports.testFulfilled = function (value, test) {
    specify("already-fulfilled", function (done) {
        test(fulfilled(value), done);
    });

    specify("immediately-fulfilled", function (done) {
        var tuple = pending();
        test(tuple.promise, done);
        tuple.fulfill(value);
    });

    specify("eventually-fulfilled", function (done) {
        var tuple = pending();
        test(tuple.promise, done);
        setTimeout(function () {
            tuple.fulfill(value);
        }, 50);
    });
};

exports.testRejected = function (reason, test) {
    specify("already-rejected", function (done) {
        test(rejected(reason), done);
    });

    specify("immediately-rejected", function (done) {
        var tuple = pending();
        test(tuple.promise, done);
        tuple.reject(reason);
    });

    specify("eventually-rejected", function (done) {
        var tuple = pending();
        test(tuple.promise, done);
        setTimeout(function () {
            tuple.reject(reason);
        }, 50);
    });
};

},{}],110:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};"use strict";

var adapter = global.adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var other = { other: "other" }; // a value we don't want to be strict equal to

exports.fulfilled = {
    "a synchronously-fulfilled custom thenable": function (value) {
        return {
            then: function (onFulfilled) {
                onFulfilled(value);
            }
        };
    },

    "an asynchronously-fulfilled custom thenable": function (value) {
        return {
            then: function (onFulfilled) {
                setTimeout(function () {
                    onFulfilled(value);
                }, 0);
            }
        };
    },

    "a synchronously-fulfilled one-time thenable": function (value) {
        var numberOfTimesThenRetrieved = 0;
        var ret = Object.create(null, {
            then: {
                get: function () {

                    if (numberOfTimesThenRetrieved === 0) {
                        ++numberOfTimesThenRetrieved;
                        return function (onFulfilled) {
                            onFulfilled(value);
                        };
                    }
                    return null;
                }
            }
        });
        return ret;
    },

    "a thenable that tries to fulfill twice": function (value) {
        return {
            then: function (onFulfilled) {
                onFulfilled(value);
                onFulfilled(other);
            }
        };
    },

    "a thenable that fulfills but then throws": function (value) {
        return {
            then: function (onFulfilled) {
                onFulfilled(value);
                throw other;
            }
        };
    },

    "an already-fulfilled promise": function (value) {
        return fulfilled(value);
    },

    "an eventually-fulfilled promise": function (value) {
        var tuple = pending();
        setTimeout(function () {
            tuple.fulfill(value);
        }, 50);
        return tuple.promise;
    }
};

exports.rejected = {
    "a synchronously-rejected custom thenable": function (reason) {
        return {
            then: function (onFulfilled, onRejected) {
                onRejected(reason);
            }
        };
    },

    "an asynchronously-rejected custom thenable": function (reason) {
        return {
            then: function (onFulfilled, onRejected) {
                setTimeout(function () {
                    onRejected(reason);
                }, 0);
            }
        };
    },

    "a synchronously-rejected one-time thenable": function (reason) {
        var numberOfTimesThenRetrieved = 0;
        return Object.create(null, {
            then: {
                get: function () {
                    if (numberOfTimesThenRetrieved === 0) {
                        ++numberOfTimesThenRetrieved;
                        return function (onFulfilled, onRejected) {
                            onRejected(reason);
                        };
                    }
                    return null;
                }
            }
        });
    },

    "a thenable that immediately throws in `then`": function (reason) {
        return {
            then: function () {
                throw reason;
            }
        };
    },

    "an object with a throwing `then` accessor": function (reason) {
        return Object.create(null, {
            then: {
                get: function () {
                    throw reason;
                }
            }
        });
    },

    "an already-rejected promise": function (reason) {
        var ret = rejected(reason);
        ret.caught(function(){});
        return ret;
    },

    "an eventually-rejected promise": function (reason) {
        var tuple = pending();
        setTimeout(function () {
            tuple.reject(reason);
        }, 50);
        return tuple.promise;
    }
};

},{}],111:[function(require,module,exports){
var process=require("__browserify_process");"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var isNodeJS = typeof process !== "undefined" &&
    typeof process.execPath === "string";

function async(cb){
    return Promise.fulfilled().nodeify(cb);
}


if( isNodeJS ) {
    describe("Late buffer", function(){

        specify("shouldn't stop at first error but continue consumption until everything is consumed", function(done){
            var originalException;
            while( originalException = process.listeners('uncaughtException').pop() ) {
                process.removeListener('uncaughtException', originalException);
            }

            var length = 10;
            var l = length;
            var a = 0;
            while(l--){
                async(function(){
                    throw (a++);
                });
            }
            var errs = [];
            process.on("uncaughtException", function(e){
                errs.push(e);
                if( errs.length === length ) {
                    var a = [];
                    for( var i = 0, len = length; i < len; ++i ) {
                        a[i] = i;
                    }
                    assert.deepEqual(a, errs);
                    done();
                }
            });
        });
    });
}
},{"../../js/debug/bluebird.js":21,"__browserify_process":16,"assert":2}],112:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

var obj = {};
var error = new Error();
var thrower = Promise.method(function() {
    throw error;
});;

var identity = Promise.method(function(val) {
    return val;
});

var array = Promise.method(function() {
    return [].slice.call(arguments);
});

var receiver = Promise.method(function() {
    return this;
});



describe("Promise.method", function(){
    specify("should reject when the function throws", function(done) {
        var async = false;
        thrower().then(assert.fail, function(e) {
            assert(async);
            assert(e === error);
            done();
        });
        async = true;
    });
    specify("should throw when the function is not a function", function(done) {
        try {
            Promise.method(null);
        }
        catch(e) {
            assert(e instanceof TypeError);
            done();
        }
    });
    specify("should call the function with the given receiver", function(done){
        var async = false;
        receiver.call(obj).then(function(val) {
            assert(async);
            assert(val === obj);
            done();
        }, assert.fail);
        async = true;
    });
    specify("should call the function with the given value", function(done){
        var async = false;
        identity(obj).then(function(val) {
            assert(async);
            assert(val === obj);
            done();
        }, assert.fail);
        async = true;
    });
    specify("should apply the function if given value is array", function(done){
        var async = false;
        array(1, 2, 3).then(function(val) {
            assert(async);
            assert.deepEqual(val, [1,2,3]);
            done();
        }, assert.fail);
        async = true;
    });

    specify("should unwrap returned promise", function(done){
        var d = Promise.pending();

        Promise.method(function(){
            return d.promise;
        })().then(function(v){
            assert(v === 3);
            done();
        })

        setTimeout(function(){
            d.fulfill(3);
        }, 13);
    });
    specify("should unwrap returned thenable", function(done){

        Promise.method(function(){
            return {
                then: function(f, v) {
                    f(3);
                }
            }
        })().then(function(v){
            assert(v === 3);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],113:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var OperationalError = Promise.OperationalError;

var erroneusNode = function(a, b, c, cb) {
    setTimeout(function(){
        cb(sentinelError);
    }, 10);
};

var sentinel = {};
var sentinelError = new OperationalError();

var successNode = function(a, b, c, cb) {
    setTimeout(function(){
        cb(null, sentinel);
    }, 10);
};

var successNodeMultipleValues = function(a, b, c, cb) {
    setTimeout(function(){
        cb(null, sentinel, sentinel, sentinel);
    }, 10);
};

var syncErroneusNode = function(a, b, c, cb) {
    cb(sentinelError);
};

var syncSuccessNode = function(a, b, c, cb) {
    cb(null, sentinel);
};

var syncSuccessNodeMultipleValues = function(a, b, c, cb) {
    cb(null, sentinel, sentinel, sentinel);
};

var errToThrow;
var thrower = Promise.promisify(function(a, b, c, cb) {
    errToThrow = new OperationalError();
    throw errToThrow;
});

var tprimitive = "Where is your stack now?";
var throwsStrings = Promise.promisify(function(cb){
    throw tprimitive;
});

var errbacksStrings = Promise.promisify(function(cb){
    cb( tprimitive );
});

var errbacksStringsAsync = Promise.promisify(function(cb){
    setTimeout(function(){
        cb( tprimitive );
    }, 13);
});

var error = Promise.promisify(erroneusNode);
var success = Promise.promisify(successNode);
var successMulti = Promise.promisify(successNodeMultipleValues);
var syncError = Promise.promisify(syncErroneusNode);
var syncSuccess = Promise.promisify(syncSuccessNode);
var syncSuccessMulti = Promise.promisify(syncSuccessNodeMultipleValues);

describe("when calling promisified function it should ", function(){


    specify("return a promise that is pending", function(done) {
        var a = error(1,2,3);
        var b = success(1,2,3);
        var c = successMulti(1,2,3);

        var calls = 0;
        function donecall() {
            if( (++calls) === 1 ) {
                done();
            }
        }

        assert.equal(a.isPending(), true);
        assert.equal(b.isPending(), true);
        assert.equal(c.isPending(), true);
        a.caught(donecall);
    });

    specify( "should use this if no receiver was given", function(done){
        var o = {};
        var fn = Promise.promisify(function(cb){

            cb(null, this === o);
        });

        o.fn = fn;

        o.fn().then(function(val){
            assert(val);
            done();
        });
    });

    specify("call future attached handlers later", function(done) {
        var a = error(1,2,3);
        var b = success(1,2,3);
        var c = successMulti(1,2,3);
        var d = syncError(1,2,3);
        var e = syncSuccess(1,2,3);
        var f = syncSuccessMulti(1,2,3);
        var calls = 0;
        function donecall() {
            if( (++calls) === 6 ) {
                done();
            }
        }

        a.caught(function(){})
        d.caught(function(){});

        setTimeout(function(){
            a.then(assert.fail, donecall);
            b.then(donecall, assert.fail);
            c.then(donecall, assert.fail);
            d.then(assert.fail, donecall);
            e.then(donecall, assert.fail);
            f.then(donecall, assert.fail);
        }, 100);
    });

    specify("Reject with the synchronously caught reason", function(done){
        thrower(1, 2, 3).then(assert.fail).caught(function(e){
            assert(e === errToThrow);
            done();
        });
    });

    specify("reject with the proper reason", function(done) {
        var a = error(1,2,3);
        var b = syncError(1,2,3);
        var calls = 0;
        function donecall() {
            if( (++calls) === 2 ) {
                done();
            }
        }

        a.caught(function(e){
            assert.equal( sentinelError, e);
            donecall();
        });
        b.caught(function(e){
            assert.equal( sentinelError, e);
            donecall();
        });
    });

    specify("fulfill with proper value(s)", function(done) {
        var a = success(1,2,3);
        var b = successMulti(1,2,3);
        var c = syncSuccess(1,2,3);
        var d = syncSuccessMulti(1,2,3);
        var calls = 0;
        function donecall() {
            if( (++calls) === 4 ) {
                done();
            }
        }

        a.then(function( val ){
            assert.equal(val, sentinel);
            donecall()
        });

        b.then(function( val ){
            assert.deepEqual( val, [sentinel, sentinel, sentinel] );
            donecall()
        });

        c.then(function( val ){
            assert.equal(val, sentinel);
            donecall()
        });

        d.then(function( val ){
            assert.deepEqual( val, [sentinel, sentinel, sentinel] );
            donecall()
        });
    });


});


describe("with more than 5 arguments", function(){

    var o = {
        value: 15,

        f: function(a,b,c,d,e,f,g, cb) {
            cb(null, [a,b,c,d,e,f,g, this.value])
        }

    }

    var prom = Promise.promisify(o.f, o);

    specify("receiver should still work", function(done) {
        prom(1,2,3,4,5,6,7).then(function(val){
            assert.deepEqual(
                val,
                [1,2,3,4,5,6,7, 15]
            );
            done();
        });

    });

});

describe("promisify on objects", function(){

    var o = {
        value: 15,

        f: function(a,b,c,d,e,f,g, cb) {
            cb(null, [a,b,c,d,e,f,g, this.value])
        }

    };

    var objf = function(){};

    objf.value = 15;
    objf.f = function(a,b,c,d,e,f,g, cb) {
        cb(null, [a,b,c,d,e,f,g, this.value])
    };

    function Test(data) {
        this.data = data;
    }

    Test.prototype.get = function(a, b, c, cb) {
        cb(null, a, b, c, this.data);
    };

    Test.prototype.getMany = function(a, b, c, d, e, f, g, cb) {
        cb(null, a, b, c, d, e, f, g, this.data);
    };

    Promise.promisifyAll(o);
    Promise.promisifyAll(objf);
    Promise.promisifyAll(Test.prototype);

    specify("should not repromisify", function() {
        var f = o.f;
        var fAsync = o.fAsync;
        var getOwnPropertyNames = Object.getOwnPropertyNames(o);
        var ret = Promise.promisifyAll(o);
        assert.equal(f, o.f);
        assert.equal(fAsync, o.fAsync);
        assert.deepEqual(getOwnPropertyNames, Object.getOwnPropertyNames(o));
        assert.equal(ret, o);
    });

    specify("should not repromisify function object", function() {
        var f = objf.f;
        var fAsync = objf.fAsync;
        var getOwnPropertyNames = Object.getOwnPropertyNames(objf);
        var ret = Promise.promisifyAll(objf);
        assert.equal(f, objf.f);
        assert.equal(fAsync, objf.fAsync);
        assert.deepEqual(getOwnPropertyNames, Object.getOwnPropertyNames(objf));
        assert.equal(ret, objf);
    });

    specify("should work on function objects too", function(done) {
        objf.fAsync(1, 2, 3, 4, 5, 6, 7).then(function(result){
            assert.deepEqual( result, [1, 2, 3, 4, 5, 6, 7, 15] );
            done();
        });
    });

    specify("should work on prototypes and not mix-up the instances", function(done) {
        var a = new Test(15);
        var b = new Test(30);
        var c = new Test(45);

        var calls = 0;

        function calldone() {
            calls++;
            if( calls === 3 ) {
                done();
            }
        }
        a.getAsync(1, 2, 3).then(function( result ){
            assert.deepEqual( result, [1, 2, 3, 15] );
            calldone();
        });

        b.getAsync(4, 5, 6).then(function( result ){
            assert.deepEqual( result, [4, 5, 6, 30] );
            calldone();
        });

        c.getAsync(7, 8, 9).then(function( result ){
            assert.deepEqual( result, [7, 8, 9, 45] );
            calldone();
        });
    });

    specify("should work on prototypes and not mix-up the instances with more than 5 arguments", function(done) {
        var a = new Test(15);
        var b = new Test(30);
        var c = new Test(45);

        var calls = 0;

        function calldone() {
            calls++;
            if( calls === 3 ) {
                done();
            }
        }
        a.getManyAsync(1, 2, 3, 4, 5, 6, 7).then(function( result ){
            assert.deepEqual( result, [1, 2, 3, 4, 5, 6, 7, 15] );
            calldone();
        });

        b.getManyAsync(4, 5, 6, 7, 8, 9, 10).then(function( result ){
            assert.deepEqual( result, [4, 5, 6, 7, 8, 9, 10, 30] );
            calldone();
        });

        c.getManyAsync(7, 8, 9, 10, 11, 12, 13).then(function( result ){
            assert.deepEqual( result, [7, 8, 9, 10, 11, 12, 13, 45] );
            calldone();
        });
    });

    specify( "Fails to promisify Async suffixed methods", function( done ) {
        var o = {
            x: function(cb){
                cb(null, 13);
            },
            xAsync: function(cb) {
                cb(null, 13);
            },

            xAsyncAsync: function( cb ) {
                cb(null, 13)
            }
        };
        try {
            Promise.promisifyAll(o);
        }
        catch (e) {
            assert(e instanceof Promise.TypeError);
            done();
        }
    });

    specify("Calls overridden methods", function(done) {
        function Model() {
            this.save = function() {
                done();
            };
        }
        Model.prototype.save = function() {
            throw new Error("");
        };

        Promise.promisifyAll(Model.prototype);
        var model = new Model();
        model.saveAsync();
    });

    specify("gh-232", function(done) {
        function f() {
            var args = [].slice.call(arguments, 0, -1);
            assert.deepEqual(args, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            var cb = [].slice.call(arguments, -1)[0];
            cb(null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        }
        var fAsync = Promise.promisify(f);
        fAsync(1, 2, 3, 4, 5, 6, 7, 8, 9, 10).then(function(result) {
            assert.deepEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            done();
        });
    });
});

describe( "Promisify with custom suffix", function() {
    it("should define methods with the custom suffix", function(done) {
        function Test() {

        }

        Test.prototype.method = function method() {};

        Promise.promisifyAll(Test.prototype, {suffix: "$P"});
        assert(typeof Test.prototype.method$P == "function");
        done();
    });

    it("should throw on invalid suffix", function(done) {
        try {
            Promise.promisifyAll({}, {suffix: ""});
        }
        catch(e) {
            done();
        }
    });
})

describe("Module promisification", function() {
    it("should promisify module with direct property classes", function(done) {
        function RedisClient() {}
        RedisClient.prototype.query = function() {};
        function Multi() {}
        Multi.prototype.exec = function() {};
        Multi.staticMethod = function() {}

        var redis = {
            RedisClient: RedisClient,
            Multi: Multi,
            moduleMethod: function() {}
        };
        redis.Multi.staticMethod.tooDeep = function() {};

        Promise.promisifyAll(redis);

        assert(typeof redis.moduleMethodAsync === "function");
        assert(typeof redis.Multi.staticMethodAsync === "function");
        assert(typeof redis.Multi.prototype.execAsync === "function");
        assert(typeof redis.RedisClient.prototype.queryAsync === "function");
        assert(typeof redis.Multi.staticMethod.tooDeepAsync === "undefined");
        done();
    })

    it("should promisify module with inherited property classes", function(done) {
        function Mongoose() {}
        var Model = Mongoose.prototype.Model = function() {};
        Model.prototype.find = function() {};
        var Document = Mongoose.prototype.Document = function() {};
        Document.prototype.create = function() {};
        Document.staticMethod = function() {};
        var mongoose = new Mongoose();

        Promise.promisifyAll(mongoose);

        assert(typeof mongoose.Model.prototype.findAsync === "function");
        assert(typeof mongoose.Document.prototype.createAsync === "function");
        assert(typeof mongoose.Document.staticMethodAsync === "function")
        done();
    })
})

describe( "Promisify from prototype to object", function() {
    var getterCalled = 0;

    function makeClass() {
        var Test = (function() {

        function Test() {

        }
        var method = Test.prototype;

        method.test = function() {

        };

        method["---invalid---"] = function(){};

        if ((function(){"use strict"; return this === void 0})()) {
            Object.defineProperty(method, "thrower", {
                enumerable: true,
                configurable: true,
                get: function() {
                    throw new Error("getter called");
                },
                set: function() {
                    throw new Error("setter called");
                }
            });
            Object.defineProperty(method, "counter", {
                enumerable: true,
                configurable: true,
                get: function() {
                    getterCalled++;
                },
                set: function() {
                    throw new Error("setter called");
                }
            });
        }

        return Test;})();

        return Test;
    }

    specify( "Shouldn't touch the prototype when promisifying instance", function(done) {
        var Test = makeClass();

        var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
        var a = new Test();
        Promise.promisifyAll(a);

        assert( typeof a.testAsync === "function" );
        assert( a.hasOwnProperty("testAsync"));
        assert.deepEqual( Object.getOwnPropertyNames(Test.prototype).sort(), origKeys );
        assert(getterCalled === 0);
        done();
    });

    specify( "Shouldn't touch the method", function(done) {
        var Test = makeClass();

        var origKeys = Object.getOwnPropertyNames(Test.prototype.test).sort();
        var a = new Test();
        Promise.promisifyAll(a);


        assert( typeof a.testAsync === "function" );
        assert.deepEqual( Object.getOwnPropertyNames(Test.prototype.test).sort(), origKeys );
        assert( Promise.promisify( a.test ) !== a.testAsync );
        assert(getterCalled === 0);
        done();
    });

    specify( "Should promisify own method even if a promisified method of same name already exists somewhere in proto chain", function(done){
        var Test = makeClass();
        var instance = new Test();
        Promise.promisifyAll( instance );
        var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
        var origInstanceKeys = Object.getOwnPropertyNames(instance).sort();
        instance.test = function() {};
        Promise.promisifyAll( instance );
        assert.deepEqual( origKeys, Object.getOwnPropertyNames(Test.prototype).sort() );
        assert.notDeepEqual( origInstanceKeys,  Object.getOwnPropertyNames(instance).sort() );
        assert(getterCalled === 0);
        done();
    });

    specify( "Shouldn promisify the method closest to the object if method of same name already exists somewhere in proto chain", function(done){
        //IF the implementation is for-in, this pretty much tests spec compliance
        var Test = makeClass();
        var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
        var instance = new Test();
        instance.test = function() {

        };
        Promise.promisifyAll(instance);

        assert.deepEqual( Object.getOwnPropertyNames(Test.prototype).sort(), origKeys );
        assert(instance.test === instance.test);
        assert(getterCalled === 0);
        done();
    });

});


function assertLongStackTraces(e) {
    assert( e.stack.indexOf("From previous event:") > -1 );
}
if( Promise.hasLongStackTraces() ) {
    describe("Primitive errors wrapping", function() {
        specify("when the node function throws it", function(done){
            throwsStrings().caught(function(e){
                assert(e instanceof Error);
                assert(e.message == tprimitive);
                done();
            });
        });

        specify("when the node function throws it inside then", function(done){
            Promise.fulfilled().then(function() {
                throwsStrings().caught(function(e) {
                    assert(e instanceof Error);
                    assert(e.message == tprimitive);
                    assertLongStackTraces(e);
                    done();
                });
            });
        });


        specify("when the node function errbacks it synchronously", function(done){
            errbacksStrings().caught(function(e){
                assert(e instanceof Error);
                assert(e.message == tprimitive);
                done();
            });
        });

        specify("when the node function errbacks it synchronously inside then", function(done){
            Promise.fulfilled().then(function(){
                errbacksStrings().caught(function(e){
                    assert(e instanceof Error);
                    assert(e.message == tprimitive);
                    assertLongStackTraces(e);
                    done();
                });
            });
        });

        specify("when the node function errbacks it asynchronously", function(done){
            errbacksStringsAsync().caught(function(e){
                assert(e instanceof Error);
                assert(e.message == tprimitive);
                assertLongStackTraces(e);
                done();
            });
        });

        specify("when the node function errbacks it asynchronously inside then", function(done){
            Promise.fulfilled().then(function(){
                errbacksStringsAsync().caught(function(e){
                    assert(e instanceof Error);
                    assert(e.message == tprimitive);
                    assertLongStackTraces(e);
                    done();
                });
            });
        });
    });
}

describe("Custom promisifier", function() {
    var dummy = {};
    var err = new Error();
    var chrome = {
        getTab: function(tabId, callback) {
            setTimeout(function() {
                callback(dummy);
            }, 1);
        },
        getTabErroneous: function(tabId, callback, errback) {
            setTimeout(function() {
                errback(err);
            }, 1);
        }
    };

    Promise.promisifyAll(chrome, {
        promisifier: function(originalMethod) {
            return function() {
                var self = this;
                var args = [].slice.call(arguments);
                return new Promise(function(f, r) {
                    args.push(f, r);
                    originalMethod.apply(self, args);
                });
            };
        }
    });

    specify("getTab", function(done) {
        chrome.getTabAsync(1).then(function(result) {
            assert.equal(dummy, result);
            done();
        });
    });

    specify("getTabErroneous", function(done) {
        chrome.getTabErroneousAsync(2).caught(function(e) {
            assert.equal(e, err);
            done();
        });
    });



});

describe("OperationalError wrapping", function() {

    var CustomError = function(){

    }
    CustomError.prototype = new Error();
    CustomError.prototype.constructor = CustomError;

    function isUntypedError( obj ) {
        return obj instanceof Error &&
            Object.getPrototypeOf( obj ) === Error.prototype;
    }


    if(!isUntypedError(new Error())) {
        console.log("error must be untyped");
    }

    if(isUntypedError(new CustomError())) {
        console.log("customerror must be typed");
    }

    function stringback(cb) {
        cb("Primitive as error");
    }

    function errback(cb) {
        cb(new Error("error as error"));
    }

    function typeback(cb) {
        cb(new CustomError());
    }

    function stringthrow(cb) {
        throw("Primitive as error");
    }

    function errthrow(cb) {
        throw(new Error("error as error"));
    }

    function typethrow(cb) {
        throw(new CustomError());
    }

    stringback = Promise.promisify(stringback);
    errback = Promise.promisify(errback);
    typeback = Promise.promisify(typeback);
    stringthrow = Promise.promisify(stringthrow);
    errthrow = Promise.promisify(errthrow);
    typethrow = Promise.promisify(typethrow);

    specify("should wrap stringback", function(done) {
        stringback().error(function(e) {
            assert(e instanceof OperationalError);
            done();
        });
    });

    specify("should wrap errback", function(done) {
        errback().error(function(e) {
            assert(e instanceof OperationalError);
            done();
        });
    });

    specify("should not wrap typeback", function(done) {
        typeback().caught(CustomError, function(e){
                done();
            });
    });

    specify("should not wrap stringthrow", function(done) {
        stringthrow().error(assert.fail).caught(function(e){
            assert(e instanceof Error);
            done();
        });
    });

    specify("should not wrap errthrow", function(done) {
        errthrow().error(assert.fail).caught(function(e) {
            assert(e instanceof Error);
            done();
        });
    });

    specify("should not wrap typethrow", function(done) {
        typethrow().error(assert.fail)
            .caught(CustomError, function(e){
                done();
            });
    });
});

var global = new Function("return this")();
var canEvaluate = (function() {
    if (typeof window !== "undefined" && window !== null &&
        typeof window.document !== "undefined" &&
        typeof navigator !== "undefined" && navigator !== null &&
        typeof navigator.appName === "string" &&
        window === global) {
        return false;
    }
    return true;
})();
var canTestArity = (function(a, b, c) {}).length === 3 && canEvaluate;

if (canTestArity) {
    describe("arity", function() {
        specify("should be original - 1", function(done) {
            var fn = function(a, b, c, callback) {};

            assert.equal(Promise.promisify(fn).length, 3);

            var o = {
                fn: function(a, b, c, callback) {

                }
            };
            assert.equal(Promise.promisifyAll(o).fnAsync.length, 3);

            done();
        })
    })
}

},{"../../js/debug/bluebird.js":21,"assert":2}],114:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;



var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};
var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.all = Promise.all;

describe("Promise.props", function () {

    specify("should reject undefined", function(done) {
        adapter.props().caught(TypeError, function(){
            done();
        })
    });

    specify("should reject primitive", function(done) {
        adapter.props("str").caught(TypeError, function(){
            done();
        })
    });

    specify("should resolve to new object", function(done) {
        var o = {};
        adapter.props(o).then(function(v){
            assert( v !== o );
            assert.deepEqual(o, v);
            done();
        });
    });

    specify("should resolve value properties", function(done) {
        var o = {
            one: 1,
            two: 2,
            three: 3
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
    });

    specify("should resolve immediate properties", function(done) {
        var o = {
            one: fulfilled(1),
            two: fulfilled(2),
            three: fulfilled(3)
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
    });

    specify("should resolve eventual properties", function(done) {
        var d1 = pending(),
            d2 = pending(),
            d3 = pending();
        var o = {
            one: d1.promise,
            two: d2.promise,
            three: d3.promise
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });

        setTimeout(function(){
            d1.fulfill(1);
            d2.fulfill(2);
            d3.fulfill(3);
        }, 13);
    });

    specify("should reject if any input promise rejects", function(done) {
        var o = {
            one: fulfilled(1),
            two: rejected(2),
            three: fulfilled(3)
        };
        adapter.props(o).then(assert.fail, function(v){
            assert( v === 2 );
            done();
        });
    });

    specify("should accept a promise for an object", function(done) {
         var o = {
            one: fulfilled(1),
            two: fulfilled(2),
            three: fulfilled(3)
        };
        var d1 = pending();
        adapter.props(d1.promise).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
        setTimeout(function(){
            d1.fulfill(o);
        }, 13);
    });

    specify("should reject a promise for a primitive", function(done) {
        var d1 = pending();
        adapter.props(d1.promise).caught(TypeError, function(){
            done();
        });
        setTimeout(function(){
            d1.fulfill("text");
        }, 13);
    });

    specify("should accept thenables in properties", function(done) {
        var t1 = {then: function(cb){cb(1);}};
        var t2 = {then: function(cb){cb(2);}};
        var t3 = {then: function(cb){cb(3);}};
        var o = {
            one: t1,
            two: t2,
            three: t3
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
    });

    specify("should accept a thenable for thenables in properties", function(done) {
        var o = {
          then: function (f) {
            f({
              one: {
                then: function (cb) {
                  cb(1);
                }
              },
              two: {
                then: function (cb) {
                  cb(2);
                }
              },
              three: {
                then: function (cb) {
                  cb(3);
                }
              }
            });
          }
        };
        adapter.props(o).then(function(v){
            assert.deepEqual({
                one: 1,
                two: 2,
                three: 3
            }, v);
            done();
        });
    });

    specify("sends { key, value } progress updates", function(done) {
        var deferred1 = Q.defer();
        var deferred2 = Q.defer();

        var progressValues = [];

        Q.delay(50).then(function () {
            deferred1.notify("a");
        });
        Q.delay(100).then(function () {
            deferred2.notify("b");
            deferred2.resolve();
        });
        Q.delay(150).then(function () {
            deferred1.notify("c");
            deferred1.resolve();
        });

        adapter.props({
            one: deferred1.promise,
            two: deferred2.promise
        }).then(function () {
            assert.deepEqual(progressValues, [
                { key: "one", value: "a" },
                { key: "two", value: "b" },
                { key: "one", value: "c" }
            ]);
            done();
        },
        undefined,
        function (progressValue) {
            progressValues.push(progressValue);
        });
    });

    specify("treats arrays for their properties", function(done) {
        var o = [1,2,3];

        adapter.props(o).then(function(v){
            assert.deepEqual({
                0: 1,
                1: 2,
                2: 3
            }, v);
            done();
        });
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],115:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;


var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

Q.delay = Promise.delay;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.all = Promise.all;

/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/
describe("all", function () {
    it("fulfills when passed an empty array", function () {
        return Q.all([]);
    });

    it("rejects after any constituent promise is rejected", function () {
        var toResolve = Q.defer(); // never resolve
        var toReject = Q.defer();
        var promises = [toResolve.promise, toReject.promise];
        var promise = Q.all(promises);

        toReject.reject(new Error("Rejected"));

        promise.caught(function(e){
            //Unhandled rejection
        });

        return Q.delay(250)
            .then(function () {
                assert.equal(promise.isRejected(), true);
            })
            .timeout(1000);


    });

    it("resolves foreign thenables", function () {
        var normal = Q(1);
        var foreign = { then: function (f) { f(2); } };

        return Q.all([normal, foreign])
        .then(function (result) {
            assert.deepEqual(result,[1, 2]);
        });
    });


    it("fulfills when passed an sparse array", function () {
        var toResolve = Q.defer();
        var promises = [];
        promises[0] = Q(0);
        promises[2] = toResolve.promise;
        var promise = Q.all(promises);

        toResolve.resolve(2);

        return promise.then(function (result) {
            assert.deepEqual(result, [0, void 0, 2]);
        });
    });

    it("sends { index, value } progress updates", function () {
        var deferred1 = Q.defer();
        var deferred2 = Q.defer();

        var progressValues = [];

        Q.delay(50).then(function () {
            deferred1.notify("a");
        });
        Q.delay(100).then(function () {
            deferred2.notify("b");
            deferred2.resolve();
        });
        Q.delay(150).then(function () {
            deferred1.notify("c");
            deferred1.resolve();
        });

        return Q.all([deferred1.promise, deferred2.promise]).then(
            function () {
                assert.deepEqual(progressValues, [
                    { index: 0, value: "a" },
                    { index: 1, value: "b" },
                    { index: 0, value: "c" }
                ]);
            },
            undefined,
            function (progressValue) {
                progressValues.push(progressValue);
            }
        )
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],116:[function(require,module,exports){
var process=require("__browserify_process");"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;



var Q = function(p) {
    if( p == null ) return fulfilled(p)
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.reject = Promise.rejected;
Q.resolve = Promise.fulfilled;

Q.allSettled = Promise.settle;

Q.spread = function(){
    return Q(arguments[0]).spread(arguments[1], arguments[2], arguments[3]);
};

Q.isPending = function( p ) {
    return p.isPending();
};

Q.fcall= function( fn ) {
    var p = Promise.pending();

    try {
        p.fulfill(fn());
    }
    catch(e){
        p.reject(e);
    }
    return p.promise;
};

var isNodeJS = typeof process !== "undefined" &&
    typeof process.execPath === "string";


/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/
describe("done", function () {
    var errCount = 0;

    var safeError = new Error("safe_error");



    describe("when the promise is fulfilled", function () {
        describe("and the callback does not throw", function () {
            it("should call the callback and return nothing", function () {
                var called = false;
                var promise = Q();

                var returnValue = promise.done(function () {
                    called = true;
                });

                return promise.caught(function () { }).lastly(function () {
                    assert.equal(called,true);
                    assert.equal(returnValue,undefined);
                });
            });
        });

        if( isNodeJS ) {
            describe("and the callback throws", function () {
                it("should rethrow that error in the next turn and return nothing", function () {
                    var originalException;
                    while( originalException = process.listeners('uncaughtException').pop() ) {
                        process.removeListener('uncaughtException', originalException);
                    }
                    var e;
                    process.on("uncaughtException", function(er){
                        if( er !== safeError ) {
                            console.log(er.stack);
                            process.exit(-1);
                        }
                        e = er;
                    });
                    var turn = 0;
                    process.nextTick(function () {
                        ++turn;
                    });

                    var returnValue = Q().done(
                        function () {
                            throw safeError;
                        }
                    );

                    setTimeout(function first() {
                        assert.equal(turn,1);
                        assert.equal(e, safeError);
                        assert.equal(returnValue,undefined);
                        deferred.resolve();
                    }, 4);
                    var deferred = Q.defer();
                    Q.delay(100).then(deferred.reject);

                    return deferred.promise;
                });
            });
        }
    });


    describe("when the promise is rejected", function () {
        describe("and the errback handles it", function () {
            it("should call the errback and return nothing", function () {
                var called = false;

                var promise = Q.reject("unsafe_error");

                var returnValue = promise.done(
                    function () { },
                    function () {
                        called = true;
                    }
                );

                return promise.caught(function () { }).lastly(function () {
                    assert.equal(called,true);
                    assert.equal(returnValue,undefined);
                });
            });
        });

        if( isNodeJS ) {
            describe("and the errback throws", function () {
                it("should rethrow that error in the next turn and return nothing", function () {
                    var originalException;
                    while( originalException = process.listeners('uncaughtException').pop() ) {
                        process.removeListener('uncaughtException', originalException);
                    }
                    var e;
                    process.on("uncaughtException", function(er){
                        if( er !== safeError ) {
                            console.log(er.stack);
                            process.exit(-1);
                        }

                        e = er;
                    });
                    var turn = 0;
                    process.nextTick(function () {
                        ++turn;
                    });

                    var returnValue = Q.reject("unsafe_error").done(
                        null,
                        function () {
                            throw safeError;
                        }
                    );

                    setTimeout(function second() {
                        assert.equal(turn,1);
                        assert.equal(e, safeError);
                        assert.equal(returnValue,undefined);
                        deferred.resolve();
                    }, 4);
                    var deferred = Q.defer();
                    Q.delay(100).then(deferred.reject);

                    return deferred.promise;
                });
            });


            describe("and there is no errback", function () {
                it("should throw the original error in the next turn", function () {
                    var originalException;
                    while( originalException = process.listeners('uncaughtException').pop() ) {
                        process.removeListener('uncaughtException', originalException);
                    }
                    var e;
                    process.on("uncaughtException", function(er){
                        if( er !== safeError ) {
                            console.log(er.stack);
                            process.exit(-1);
                        }

                        e = er;
                    });
                    var turn = 0;
                    process.nextTick(function () {
                        ++turn;
                    });

                    var returnValue = Q.reject(safeError).done();

                    setTimeout(function third() {
                        assert.equal(turn,1);
                        assert.equal(e, safeError);
                        assert.equal(returnValue,undefined);
                        deferred.resolve();
                    }, 4);
                    var deferred = Q.defer();
                    Q.delay(100).then(deferred.reject);

                    return deferred.promise;
                });
            });
        }
    });

    it("should attach a progress listener", function () {
        var sinon = require("sinon");
        var deferred = Q.defer();

        var spy = sinon.spy();
        deferred.promise.done(null, null, spy);

        deferred.notify(10);
        deferred.resolve();

        return deferred.promise.then(function () {
            sinon.assert.calledWith(spy, sinon.match.same(10));
        });
    });

});

},{"../../js/debug/bluebird.js":21,"__browserify_process":16,"assert":2,"sinon":55}],117:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;


var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;
Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.reject = Promise.rejected;
Q.resolve = Promise.fulfilled;

Q.allSettled = Promise.settle;

Q.spread = function(){
    return Q(arguments[0]).spread(arguments[1], arguments[2], arguments[3]);
};

Q.isPending = function( p ) {
    return p.isPending();
};

Q.fcall= function( fn ) {
    var p = Promise.pending();

    try {
        p.fulfill(fn());
    }
    catch(e){
        p.reject(e);
    }
    return p.promise;
};
/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

describe("finally", function () {

    var exception1 = new Error("boo!");
    var exception2 = new Promise.TypeError("evil!");

    describe("when nothing is passed", function() {
        it("should do nothing", function(done) {
            Q("foo")
                .lastly()
                .lastly()
                .lastly()
                .lastly()
                .then(function(val){
                    assert(val === "foo");
                    done();
                })
        });
    });

    describe("when the promise is fulfilled", function () {

        it("should call the callback", function (done) {
            var called = false;

            Q("foo")
            .lastly(function () {
                called = true;
            })
            .then(function () {
                assert.equal(called,true);
                done();
            });
        });

        it("should fulfill with the original value", function (done) {
            Q("foo")
            .lastly(function () {
                return "bar";
            })
            .then(function (result) {
                assert.equal(result,"foo");
                done();
            });
        });

        describe("when the callback returns a promise", function () {

            describe("that is fulfilled", function () {
                it("should fulfill with the original reason after that promise resolves", function (done) {
                    var promise = Q.delay(250);

                    Q("foo")
                    .lastly(function () {
                        return promise;
                    })
                    .then(function (result) {
                        assert.equal(Q.isPending(promise),false);
                        assert.equal(result,"foo");
                        done();
                    });
                });
            });

            describe("that is rejected", function () {
                it("should reject with this new rejection reason", function (done) {
                    Q("foo")
                    .lastly(function () {
                        return Q.reject(exception1);
                    })
                    .then(function () {
                        assert.equal(false,true);
                    },
                    function (exception) {
                        assert.equal(exception,exception1);
                        done();
                    });
                });
            });

        });

        describe("when the callback throws an exception", function () {
            it("should reject with this new exception", function (done) {
                Q("foo")
                .lastly(function () {
                    throw exception1;
                })
                .then(function () {
                    assert.equal(false,true);
                },
                function (exception) {
                    assert.equal(exception,exception1);
                    done();
                });
            });
        });

    });

    describe("when the promise is rejected", function () {

        it("should call the callback", function (done) {
            var called = false;

            Q.reject(exception1)
            .lastly(function () {
                called = true;
            })
            .then(function () {
                assert.fail();
            }, function () {
                assert.equal(called,true);
                done();
            });
        });

        it("should reject with the original reason", function (done) {
            Q.reject(exception1)
            .lastly(function () {
                return "bar";
            })
            .then(function () {
                assert.equal(false,true);
            },
            function (exception) {
                assert.equal(exception,exception1);
                done();
            });
        });

        describe("when the callback returns a promise", function () {

            describe("that is fulfilled", function () {
                it("should reject with the original reason after that promise resolves", function (done) {
                    var promise = Q.delay(250);

                    Q.reject(exception1)
                    .lastly(function () {
                        return promise;
                    })
                    .then(function () {
                        assert.equal(false,true);
                    },
                    function (exception) {
                        assert.equal(exception,exception1);
                        assert.equal(Q.isPending(promise),false);
                        done();
                    });
                });
            });

            describe("that is rejected", function () {
                it("should reject with the new reason", function (done) {
                    Q.reject(exception1)
                    .lastly(function () {
                        return Q.reject(exception2);
                    })
                    .then(function () {
                        assert.equal(false,true);
                    },
                    function (exception) {
                        assert.equal(exception,exception2);
                        done();
                    });
                });
            });

        });

        describe("when the callback throws an exception", function () {
            it("should reject with this new exception", function (done) {
                Q.reject(exception1)
                .lastly(function () {
                    throw exception2;
                })
                .then(function () {
                    assert.equal(false,true);
                },
                function (exception) {
                    assert.equal(exception,exception2);
                    done();
                });
            });
        });

    });

    describe("when the callback returns a thenable", function () {

        describe("that will fulfill", function () {
            it("should reject with the original reason after that", function (done) {
                var promise = {
                    then: function(fn) {
                        setTimeout(function(){
                            fn(15);
                        }, 13);
                    }
                };

                return Q.reject(exception1)
                .lastly(function () {
                    return promise;
                })
                .then(function () {
                    assert.equal(false,true);
                },
                function (exception) {
                    assert.equal(exception,exception1);
                    done();
                });
            });
        });

        describe("that is rejected", function () {
            it("should reject with the new reason", function (done) {
                var promise = {
                    then: function(f, fn) {
                        setTimeout(function(){
                            fn(exception2);
                        }, 13);
                    }
                };

                return Q.reject(exception1)
                .lastly(function () {
                    return promise;
                })
                .then(function () {
                    assert.equal(false,true);
                },
                function (exception) {
                    assert.equal(exception,exception2);
                    done();
                });
            });
        });

    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],118:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;



var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.reject= function(p, cb) {
    return Q(p).then(null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/
// In browsers that support strict mode, it'll be `undefined`; otherwise, the global.
var calledAsFunctionThis = (function () { return this; }());
describe("inspect", function () {

    it("for a fulfilled promise", function () {
        var ret = fulfilled(10);
        assert.equal(ret.value(), 10);
        assert.equal(ret.isFulfilled(), true );

    });

    it("for a rejected promise", function () {
        var e = new Error("In your face.");
        var ret = rejected(e);
        assert.equal(ret.reason(), e);
        assert.equal(ret.isRejected(), true );
        ret.caught(function(){})
    });

    it("for a pending, unresolved promise", function () {
        var pending = Q.defer().promise;
        assert.equal(pending.isPending(), true);
    });

    it("for a promise resolved to a rejected promise", function () {
        var deferred = Q.defer();
        var error = new Error("Rejected!");
        var reject = rejected(error);
        deferred.resolve(reject);

        assert.equal( deferred.promise.isRejected(), true );
        assert.equal( deferred.promise.reason(), error );
        deferred.promise.caught(function(){})
    });

    it("for a promise resolved to a fulfilled promise", function () {
        var deferred = Q.defer();
        var fulfilled = Q(10);
        deferred.resolve(fulfilled);

        assert.equal( deferred.promise.isFulfilled(), true );
        assert.equal( deferred.promise.value(), 10 );
    });

    it("for a promise resolved to a pending promise", function () {
        var a = Q.defer();
        var b = Q.defer();
        a.resolve(b.promise);

        assert.equal(a.promise.isPending(), true);
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],119:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
/*
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/


describe("PromiseResolver.callback", function () {

    it("fulfills a promise with a single callback argument", function (done) {
        var resolver = pending();
        resolver.callback(null, 10);
        resolver.promise.then(function (value) {
            assert( value === 10 );
            done();
        });
    });

    it("fulfills a promise with multiple callback arguments", function (done) {
        var resolver = pending();
        resolver.callback(null, 10, 20);
        resolver.promise.then(function (value) {
            assert.deepEqual( value, [ 10, 20 ] );
            done();
        });
    });

    it("rejects a promise", function (done) {
        var resolver = pending();
        var exception = new Error("Holy Exception of Anitoch");
        resolver.callback(exception);
        resolver.promise.then(assert.fail, function (_exception) {
            assert( exception === _exception.cause );
            done();
        });
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],120:[function(require,module,exports){
var process=require("__browserify_process");"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;



var Q = function(p) {
    if( p == null ) return fulfilled(p)
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;
Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.reject = Promise.rejected;
Q.resolve = Promise.fulfilled;

Q.allSettled = Promise.settle;

Q.spread = function(){
    return Q(arguments[0]).spread(arguments[1], arguments[2], arguments[3]);
};

Q.isPending = function( p ) {
    return p.isPending();
};

Q.fcall= function( fn ) {
    var p = Promise.pending();

    try {
        p.fulfill(fn());
    }
    catch(e){
        p.reject(e);
    }
    return p.promise;
};

var sinon = require("sinon");


var isNodeJS = typeof process !== "undefined" &&
    typeof process.execPath === "string";


/*
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

describe("nodeify", function () {

    it("calls back with a resolution", function () {
        var spy = sinon.spy();
        Q(10).nodeify(spy);
        setTimeout(function(){
            sinon.assert.calledOnce(spy);
            sinon.assert.calledWith(spy, null, 10);
        }, 100);
    });

    it("calls back with an undefined resolution", function (done) {
        var spy = sinon.spy();
        Q().nodeify(spy);
        setTimeout(function(){
            sinon.assert.calledOnce(spy);
            sinon.assert.calledWithExactly(spy, null);
            done();
        }, 10);
    });

    it("calls back with an error", function () {
        var spy = sinon.spy();
        Q.reject(10).nodeify(spy);
        setTimeout(function(){
            sinon.assert.calledOnce(spy);
            sinon.assert.calledWith(spy, 10);
        }, 100);
    });

    it("forwards a promise", function () {
        return Q(10).nodeify().then(function (ten) {
            assert(10 === ten);
        });
    });

    it("returns undefined when a callback is passed", function () {
        return 'undefined' === typeof Q(10).nodeify(function () {});
    });

});


//Should be the last test because it is ridiculously hard to test
//if something throws in the node process

if( isNodeJS ) {
    describe("nodeify", function () {

        var h = [];

        function clearHandlers() {
            var originalException;
            while( originalException = process.listeners('uncaughtException').pop() ) {
                process.removeListener('uncaughtException', originalException);
                h.push(originalException);
            }
        }

        function clearHandlersNoRestore() {
            var originalException;
            while( originalException = process.listeners('uncaughtException').pop() ) {
                process.removeListener('uncaughtException', originalException);
            }
        }

        function addHandlersBack() {
            for( var i = 0, len = h.length; i < len; ++i ) {
                process.addListener('uncaughtException', h[i]);
            }
        }
        var e = new Error();
        function thrower() {
            throw e;
        }

        it("throws normally in the node process if the function throws", function (done) {
            clearHandlers();
            var promise = Q(10);
            var turns = 0;
            process.nextTick(function(){
                turns++;
            });
            promise.nodeify(thrower);
            process.addListener("uncaughtException", function(err) {
                clearHandlersNoRestore();
                assert( err === e );
                assert( turns === 1);
                done();
            });
        });

        it("always returns promise for now", function(done){
            Promise.resolve(3).nodeify().then(function() {
                var a = 0;
                Promise.resolve(3).nodeify(function(){
                    a++;
                }).then(function(){
                    assert(1 == 1);
                    done();
                });
            })
        });

        it("should spread arguments with spread option", function(done) {
            Promise.resolve([1,2,3]).nodeify(function(err, a, b, c) {
                assert(err === null);
                assert(a === 1);
                assert(b === 2);
                assert(c === 3);
                done();
            }, {spread: true});
        });
    });
}

},{"../../js/debug/bluebird.js":21,"__browserify_process":16,"assert":2,"sinon":55}],121:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;

var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/
// In browsers that support strict mode, it'll be `undefined`; otherwise, the global.
var calledAsFunctionThis = (function () { return this; }());
describe("progress", function () {

    it("calls a single progress listener", function () {
        var progressed = false;
        var deferred = Q.defer();

        var promise = Q.when(
            deferred.promise,
            function () {
                assert.equal(progressed,true);
            },
            function () {
                assert.equal(true,false);
            },
            function () {
                progressed = true;
            }
        );

        deferred.notify();
        deferred.resolve();

        return promise;
    });

    it("calls multiple progress listeners", function () {
        var progressed1 = false;
        var progressed2 = false;
        var deferred = Q.defer();
        var promise = Q.when(
            deferred.promise,
            function () {
                assert.equal(progressed1,true);
                assert.equal(progressed2,true);
            },
            function () {
                assert.equal(true,false);
            },
            function () {
                progressed1 = true;
            }
        );
        Q.when(deferred.promise, null, null, function () {
            progressed2 = true;
        });

        deferred.notify();
        deferred.resolve();

        return promise;
    });

    it("calls all progress listeners even if one throws", function () {
        var progressed1 = false;
        var progressed2 = false;
        var progressed3 = false;
        var deferred = Q.defer();
        var promise = Q.when(
            deferred.promise,
            function () {
                assert.equal(progressed1,true);
                assert.equal(progressed2,true);
                assert.equal(progressed3,true);
            },
            function () {
                assert.equal(true,false);
            },
            function () {
                progressed1 = true;
            }
        );

        Q.onerror = function () { };

        Q.when(deferred.promise, null, null, function () {
            progressed2 = true;
            throw new Error("just a test, ok if it shows up in the console");
        });
        Q.when(deferred.promise, null, null, function () {
            progressed3 = true;
        });

        deferred.notify();
        deferred.resolve();

        return promise;
    });

    it("calls the progress listener even if later rejected", function () {
        var progressed = false;
        var deferred = Q.defer();
        var promise = Q.when(
            deferred.promise,
            function () {
                assert.equal(true,false);
            },
            function () {
                assert.equal(progressed, true);
            },
            function () {
                progressed = true;
            }
        );

        deferred.notify();
        deferred.reject();

        return promise;
    });

    it("calls the progress listener with the notify values", function () {
        var progressValues = [];
        var desiredProgressValues = [{}, {}, "foo", 5];
        var deferred = Q.defer();
        var promise = Q.when(
            deferred.promise,
            function () {
                for (var i = 0; i < desiredProgressValues.length; ++i) {
                    var desired = desiredProgressValues[i];
                    var actual = progressValues[i];
                    assert.equal(actual,desired);
                }
            },
            function () {
                assert.equal(true,false);
            },
            function (value) {
                progressValues.push(value);
            }
        );

        for (var i = 0; i < desiredProgressValues.length; ++i) {
            deferred.notify(desiredProgressValues[i]);
        }
        deferred.resolve();

        return promise;
    });

    it("does not call the progress listener if notify is called after fulfillment", function () {
        var deferred = Q.defer();
        var called = false;

        Q.when(deferred.promise, null, null, function () {
            called = true;
        });

        deferred.resolve();
        deferred.notify();

        return Q.delay(10).then(function () {
            assert.equal(called,false);
        });
    });

    it("does not call the progress listener if notify is called after rejection", function () {
        var deferred = Q.defer();
        var called = false;

        Q.when(deferred.promise, null, null, function () {
            called = true;
        }).caught(function(){});

        deferred.reject();
        deferred.notify();

        return Q.delay(10).then(function () {
            assert.equal(called,false);
        });

        deferred.promise.caught(function(){});
    });

    it("should not save and re-emit progress notifications", function () {
        var deferred = Q.defer();
        var progressValues = [];

        deferred.notify(1);
        //Add delay(30), cannot pass original when giving async guarantee
        return Q.delay(30).then(function(){

            var promise = Q.when(
                deferred.promise,
                function () {
                    assert.deepEqual(progressValues, [2]);
                },
                function () {
                    assert.equal(true, false);
                },
                function (progressValue) {
                    progressValues.push(progressValue);
                }
            );
            deferred.notify(2);
            deferred.resolve();

            return promise;
        });
    });

    it("should allow attaching progress listeners w/ .progress", function () {
        var progressed = false;
        var deferred = Q.defer();

        deferred.promise.progressed(function () {
            progressed = true;
        });

        deferred.notify();
        deferred.resolve();

        return deferred.promise;
    });

    it("should allow attaching progress listeners w/ Q.progress", function () {
        var progressed = false;
        var deferred = Q.defer();

        Q.progress(deferred.promise, function () {
            progressed = true;
        });

        deferred.notify();
        deferred.resolve();

        return deferred.promise;
    });

    it("should call the progress listener with undefined context", function () {
        var progressed = false;
        var progressContext = {};
        var deferred = Q.defer();
        var promise = Q.when(
            deferred.promise,
            function () {
                assert.equal(progressed,true);
                assert.equal(progressContext, calledAsFunctionThis);
            },
            function () {
                assert.equal(true,false);
            },
            function () {
                progressed = true;
                progressContext = this;
            }
        );

        deferred.notify();
        deferred.resolve();

        return promise;
    });

    it("should forward only the first notify argument to listeners", function () {
        var progressValueArrays = [];
        var deferred = Q.defer();

        var promise = Q.when(
            deferred.promise,
            function () {
                assert.deepEqual(progressValueArrays, [[1], [2], [4]]);
            },
            function () {
                assert.equal(true,false);
            },
            function () {
                var args = Array.prototype.slice.call(arguments);
                progressValueArrays.push(args);
            }
        );

        deferred.notify(1);
        deferred.notify(2, 3);
        deferred.notify(4, 5, 6);
        deferred.resolve();

        return promise;
    });

    it("should work with .then as well", function () {
        var progressed = false;
        var deferred = Q.defer();

        var promise = deferred.promise.then(
            function () {
                assert.equal(progressed,true);
            },
            function () {
                assert.equal(true,false);
            },
            function () {
                progressed = true;
            }
        );

        deferred.notify();
        deferred.resolve();

        return promise;
    });


    specify("should not choke when internal functions are registered on the promise", function(done) {
        var d = adapter.defer();
        var progress = 0;

        //calls ._then on the d.promise with smuggled data and void 0 progress handler
        Promise.race([d.promise]).then(function(v){
            assert(v === 3);
            assert(progress === 1);
            done();
        });

        d.promise.progressed(function(v){
            assert(v === 5);
            progress++;
        });

        d.progress(5);

        setTimeout(function(){
            d.fulfill(3);
        }, 13);
    });

    specify("GH-36", function(done) {
        var order = [];
        var p = Promise.resolve();

        var _d = Promise.defer();
        var progress = 0;

        _d.progress(progress)
        _d.resolve()
        _d.promise.progressed(function() {
            order.push(1);
            p.then(function() {
                order.push(3);
            })
        })

        _d.promise.then(function() {
            order.push(2);
            p.then(function() {
                order.push(4);
            });
        });

        setTimeout(function(){
            assert.deepEqual(order, [1,2,3,4]);
            done();
        }, 13);
    });

    specify("GH-88", function(done) {
        var thenable = {
            then: function(f, r, p) {
                setTimeout(function(){
                    var l = 10;
                    while(l--) {
                        p(4);
                    }
                    setTimeout(function(){
                        f(3);
                    }, 13);
                }, 13);
            }
        };

        var promise = Promise.cast(thenable);
        var count = 0;
        promise.progressed(function(v){
            count++;
            assert.equal(v, 4);
        });
        promise.then(function(v) {
            assert.equal(count, 10);
            assert.equal(v, 3);
            done();
        });

    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],122:[function(require,module,exports){
"use strict";
var assert = require("assert");
var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;

var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};


Q.delay = Promise.delay;

Q.reject = Promise.rejected;
Q.resolve = Promise.fulfilled;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.all = Promise.all;


/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/
describe("propagation", function () {

    it("propagate through then with no callback", function () {
        return Q(10)
        .then()
        .then(function (ten) {
            assert.equal(ten,10);
        });
    });

    it("propagate through then with modifying callback", function () {
        return Q(10)
        .then(function (ten) {
            return ten + 10;
        })
        .then(function (twen) {
            assert.equal(twen,20);
        });
    });

    it("errback recovers from exception", function () {
        var error = new Error("Bah!");
        return Q.reject(error)
        .then(null, function (_error) {
            assert.equal(_error,error);
            return 10;
        })
        .then(function (value) {
            assert.equal(value,10);
        });
    });

    it("rejection propagates through then with no errback", function () {
        var error = new Error("Foolish mortals!");
        return Q.reject(error)
        .then()
        .then(null, function (_error) {
            assert.equal(_error,error);
        });
    });

    it("rejection intercepted and rethrown", function () {
        var error = new Error("Foolish mortals!");
        var nextError = new Error("Silly humans!");
        return Q.reject(error)
        .caught(function () {
            throw nextError;
        })
        .then(null, function (_error) {
            assert.equal(_error,nextError);
        });
    });

    it("resolution is forwarded through deferred promise", function () {
        var a = Q.defer();
        var b = Q.defer();
        a.resolve(b.promise);
        b.resolve(10);
        return a.promise.then(function (eh) {
            assert.equal(eh, 10);
        });
    });

    it("should propagate progress by default", function () {
        var d = Q.defer();

        var progressValues = [];
        var promise = d.promise
        .then()
        .then(
            function () {
                assert.deepEqual(progressValues, [1]);
            },
            function () {
                assert.equal(true,false);
            },
            function (progressValue) {
                progressValues.push(progressValue);
            }
        );

        d.notify(1);
        d.resolve();

        return promise;
    });

    it("should allow translation of progress in the progressback", function () {
        var d = Q.defer();

        var progressValues = [];
        var promise = d.promise
        .progressed(function (p) {
            return p + 5;
        })
        .then(
            function () {
                assert.deepEqual(progressValues, [10]);
            },
            function () {
                assert.equal(true,false);
            },
            function (progressValue) {
                progressValues.push(progressValue);
            }
        );

        d.notify(5);
        d.resolve();

        return promise;
    });

    //Addiotion: It should NOT but it was actually unspecced what should be the value
    it("should NOT stop progress propagation if an error is thrown", function () {
        var def = Q.defer();
        var e = new Error("boo!");
        var p2 = def.promise.progressed(function () {
            throw e
        });

        Q.onerror = function () { /* just swallow it for this test */ };

        var progressValues = [];
        var result = p2.then(
            function () {
                assert.deepEqual(progressValues, [e]);
            },
            function () {
                assert.equal(true,false);
            },
            function (progressValue) {
                progressValues.push(progressValue);
            }
        );

        def.notify();
        def.resolve();
        return result;
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],123:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;



var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.reject = Promise.rejected;
Q.resolve = Promise.fulfilled;

Q.allSettled = Promise.settle;

Q.fcall= function( fn ) {
    var p = Promise.pending();

    try {
        p.fulfill(fn());
    }
    catch(e){
        p.reject(e);
    }
    return p.promise;
};



/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

describe("allSettled", function () {
    it("works on an empty array", function () {
        return Q.allSettled([])
        .then(function (snapshots) {
            assert.deepEqual(snapshots, []);
        });
    });

    it("deals with a mix of non-promises and promises", function () {
        return Q.allSettled([1, Q(2), Q.reject(3)])
        .then(function (snapshots) {
            assert.equal( snapshots[0].value(), 1 );
            assert.equal( snapshots[1].value(), 2 );
            assert.equal( snapshots[2].error(), 3 );
        });
    });

    it("is settled after every constituent promise is settled", function () {
        var toFulfill = Q.defer();
        var toReject = Q.defer();
        var promises = [toFulfill.promise, toReject.promise];
        var fulfilled;
        var rejected;

        Q.fcall(function () {
            toReject.reject();
            rejected = true;
        })
        .delay(15)
        .then(function () {
            toFulfill.resolve();
            fulfilled = true;
        });

        return Q.allSettled(promises)
        .then(function () {
            assert.equal(fulfilled, true);
            assert.equal(rejected, true);
        });
    });

    it("does not modify the input array", function () {
        var input = [1, Q(2), Q.reject(3)];

        return Q.allSettled(input)
        .then(function (snapshots) {
            assert.notEqual( snapshots, input );
            assert.equal( snapshots[0].value(), 1 );
            assert.equal( snapshots[1].value(), 2 );
            assert.equal( snapshots[2].error(), 3 );
        });
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],124:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var Promise = fulfilled().constructor;

var Q = function(p) {
    if( p.then ) return p;
    return fulfilled(p);
};

Q.progress = function(p, cb) {
    return Q(p).then(null, null, cb);
};

Q.when = function() {
    return Q(arguments[0]).then(arguments[1], arguments[2], arguments[3]);
};

var freeMs;
function resolver( fulfill ) {
    setTimeout(fulfill, freeMs );
};

Q.delay = Promise.delay;

Q.defer = function() {
    var ret = pending();
    return {
        reject: function(a){
            return ret.reject(a)
        },
        resolve: function(a) {
            return ret.fulfill(a);
        },

        notify: function(a) {
            return ret.progress(a);
        },

        promise: ret.promise
    };
};

Q.reject = Promise.rejected;
Q.resolve = Promise.fulfilled;

Q.allSettled = Promise.settle;

Q.spread = function(){
    return Q(arguments[0]).spread(arguments[1], arguments[2], arguments[3]);
};

Q.fcall= function( fn ) {
    var p = Promise.pending();

    try {
        p.fulfill(fn());
    }
    catch(e){
        p.reject(e);
    }
    return p.promise;
};



/*!
 *
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

describe("spread", function () {



    it("spreads values across arguments", function () {
        return Q.spread([1, 2, 3], function (a, b) {
            assert.equal(b,2);
        });
    });

    it("spreads promises for arrays across arguments", function () {
        return Q([Q(10)])
        .spread(function (value) {
            assert.equal(value,10);
        });
    });

    it("spreads arrays of promises across arguments", function () {
        var deferredA = Q.defer();
        var deferredB = Q.defer();

        var promise = Q.spread([deferredA.promise, deferredB.promise],
                               function (a, b) {
            assert.equal(a,10);
            assert.equal(b,20);
        });

        Q.delay(5).then(function () {
            deferredA.resolve(10);
        });
        Q.delay(10).then(function () {
            deferredB.resolve(20);
        });

        return promise;
    });

    it("spreads arrays of thenables across arguments", function () {
        var p1 = {
            then: function(v) {
                v(10);
            }
        };
        var p2 = {
            then: function(v) {
                v(20);
            }
        };

        var promise = Q.spread([p1, p2],
                               function (a, b) {
            assert.equal(a,10);
            assert.equal(b,20);
        });
        return promise;
    });

    it("calls the errback when given a rejected promise", function (done) {
        var err = new Error();
        adapter.all([fulfilled(10), rejected(err)]).spread(assert.fail,
            function(actual){
            assert( actual === err );
            done();
        });
    });

    it("should wait for promises in the returned array even when not calling .all", function(done) {
        var d1 = Promise.defer();
        var d2 = Promise.defer();
        var d3 = Promise.defer();
        Promise.resolve().then(function(){
            return [d1.promise, d2.promise, d3.promise];
        }).spread(function(a, b, c){
            assert(a === 1);
            assert(b === 2);
            assert(c === 3);
            done();
        });

        setTimeout(function(){
            d1.resolve(1);
            d2.resolve(2);
            d3.resolve(3);
        }, 13);
    });

    it("should wait for thenables in the returned array even when not calling .all", function(done) {
        var t1 = {
            then: function(fn) {
                setTimeout(function(){
                    fn(1);
                }, 13);
            }
        };
        var t2 = {
            then: function(fn) {
                setTimeout(function(){
                    fn(2);
                }, 13);
            }
        };
        var t3 = {
            then: function(fn) {
                setTimeout(function(){
                    fn(3);
                }, 13);
            }
        };
        Promise.resolve().then(function(){
            return [t1, t2, t3];
        }).spread(function(a, b, c){
            assert(a === 1);
            assert(b === 2);
            assert(c === 3);
            done();
        });
    });

    it("should wait for promises in an array that a returned promise resolves to even when not calling .all", function(done) {
        var d1 = Promise.defer();
        var d2 = Promise.defer();
        var d3 = Promise.defer();
        var defer = Promise.defer();
        Promise.resolve().then(function(){
            return defer.promise;
        }).spread(function(a, b, c){
            assert(a === 1);
            assert(b === 2);
            assert(c === 3);
            done();
        });

        setTimeout(function(){
            defer.resolve([d1.promise, d2.promise, d3.promise]);
            setTimeout(function(){
                d1.resolve(1);
                d2.resolve(2);
                d3.resolve(3);
            }, 13);
        }, 13);

    });

    it("should wait for thenables in an array that a returned thenable resolves to even when not calling .all", function(done) {
        var t1 = {
            then: function(fn) {
                setTimeout(function(){
                    fn(1);
                }, 13);
            }
        };
        var t2 = {
            then: function(fn) {
                setTimeout(function(){
                    fn(2);
                }, 13);
            }
        };
        var t3 = {
            then: function(fn) {
                setTimeout(function(){
                    fn(3);
                }, 13);
            }
        };

        var thenable = {
            then: function(fn) {
                setTimeout(function(){
                    fn([t1, t2, t3])
                }, 13);
            }
        };

        Promise.resolve().then(function(){
            return thenable;
        }).spread(function(a, b, c){
            assert(a === 1);
            assert(b === 2);
            assert(c === 3);
            done();
        });
    });

    it("should reject with error when non array is the ultimate value to be spread", function(done){
        Promise.resolve().then(function(){
            return 3
        }).spread(function(a, b, c){
            assert.fail();
        }).caught(function(e){
            done();
        })
    });

    specify("gh-235", function(done) {
        var P = Promise;
        P.resolve(1).then(function(x) {
          return [x, P.resolve(2)]
        }).spread(function(x, y) {
          return P.all([P.resolve(3), P.resolve(4)]);
        }).then(function(a) {
          assert.deepEqual([3, 4], a);
          done();
        });
    })
});

},{"../../js/debug/bluebird.js":21,"assert":2}],125:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;



describe("Promise.race", function(){
    it("remains forever pending when passed an empty array", function (done) {
        var p = Promise.race([]);

        setTimeout(function() {
            assert(p.isPending());
            done();
        }, 100);
    });

    it("remains forever pending when passed an empty sparse array", function (done) {
        var p = Promise.race([,,,,,]);


        setTimeout(function() {
            assert(p.isPending());
            done();
        }, 100);
    });

    it("fulfills when passed an immediate value", function (done) {
        Promise.race([1,2,3]).then(function(v){
            assert.deepEqual(v, 1);
            done();
        });
    });

    it("fulfills when passed an immediately fulfilled value", function (done) {
        var d1 = Promise.pending();
        d1.fulfill(1);
        var p1 = d1.promise;

        var d2 = Promise.pending();
        d2.fulfill(2);
        var p2 = d2.promise;

        var d3 = Promise.pending();
        d3.fulfill(3);
        var p3 = d3.promise;

        Promise.race([p1, p2, p3]).then(function(v){
            assert.deepEqual(v, 1);
            done();
        });
    });

    it("fulfills when passed an eventually fulfilled value", function (done) {
        var d1 = Promise.pending();
        var p1 = d1.promise;

        var d2 = Promise.pending();
        var p2 = d2.promise;

        var d3 = Promise.pending();
        var p3 = d3.promise;

        Promise.race([p1, p2, p3]).then(function(v){
            assert.deepEqual(v, 1);
            done();
        });

        setTimeout(function(){
            d1.fulfill(1);
            d2.fulfill(2);
            d3.fulfill(3);
        }, 13);
    });

    it("rejects when passed an immediate value", function (done) {
        Promise.race([Promise.rejected(1), 2, 3]).then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    });

    it("rejects when passed an immediately rejected value", function (done) {
        var d1 = Promise.pending();
        d1.reject(1);
        var p1 = d1.promise;

        var d2 = Promise.pending();
        d2.fulfill(2);
        var p2 = d2.promise;

        var d3 = Promise.pending();
        d3.fulfill(3);
        var p3 = d3.promise;

        Promise.race([, p1, , p2, , ,  p3]).then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        });
    });

    it("rejects when passed an eventually rejected value", function (done) {
        var d1 = Promise.pending();
        var p1 = d1.promise;

        var d2 = Promise.pending();
        var p2 = d2.promise;

        var d3 = Promise.pending();
        var p3 = d3.promise;

        Promise.race([p1, p2, p3]).then(assert.fail, function(v){
            assert.deepEqual(v, 1);
            done();
        })

        setTimeout(function(){
            d1.reject(1);
            d2.fulfill(2);
            d3.fulfill(3);
        }, 13);
    });

    it( "propagates bound value", function(done) {
        var o = {};
        Promise.fulfilled([1]).bind(o).race().then(function(v){
            assert(v === 1);
            assert(this === o);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],126:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var Promise = adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

function promised(val) {
    return new Promise(function(f) {
        setTimeout(function() {
            f(val);
        }, 4);
    });
}

function thenabled(val) {
    return {
        then: function(f){
            setTimeout(function() {
                f(val);
            }, 4);
        }
    };
}

describe("Promise.prototype.reduce", function() {


    it("should allow returning values", function(done) {
        var a = [promised(1), promised(2), promised(3)];

        Promise.reduce(a, function(total, a) {
            return total + a + 5;
        }, 0).then(function(total){
            assert.equal(total, 1+5 + 2+5 + 3+5);
            done();
        });
    });

    it("should allow returning promises", function(done) {
        var a = [promised(1), promised(2), promised(3)];

        Promise.reduce(a, function(total, a) {
            return promised(5).then(function(b) {
                return total + a + b;
            });
        }, 0).then(function(total){
            assert.equal(total, 1+5 + 2+5 + 3+5);
            done();
        });
    });

    it("should allow returning thenables", function(done) {
        var b = [1,2,3];
        var a = [];

        Promise.reduce(b, function(total, cur) {
            a.push(cur);
            return thenabled(3);
        }, 0).then(function(total){
            assert.equal(total, 3);
            assert.deepEqual(a, b),
            done();
        });
    });

    it("propagates error", function(done) {
        var a = [promised(1), promised(2), promised(3)];
        var e = new Error("asd");
        Promise.reduce(a, function(total, a) {
            if (a > 2) {
                throw e;
            }
            return total + a + 5;
        }, 0).then(assert.fail, function(err) {
            assert.equal(err, e);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],127:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

var getValues = function() {
    var d = Promise.defer();
    var f = Promise.resolve(3);
    var r = Promise.reject(3);

    setTimeout(function(){
        d.resolve(3);
    }, 40);

    return {
        value: 3,
        thenableFulfill: {then: function(fn){setTimeout(function(){fn(3)}, 40);}},
        thenableReject: {then: function(_, fn){setTimeout(function(){fn(3)}, 40);}},
        promiseFulfilled: f,
        promiseRejected: r,
        promiseEventual: d.promise
    };
};

function expect(count, done) {
    var total = 0;
    return function() {
        total++;
        if (total >= count) {
            done();
        }
    }
}

describe("Promise.resolve", function() {
    specify("follows thenables and promises", function(done) {
        done = expect(6, done);
        var values = getValues();
        var async = false;

        function onFulfilled(v) {
            assert(v === 3);
            assert(async);
            done();
        }

        Promise.resolve(values.value).then(onFulfilled);
        Promise.resolve(values.thenableFulfill).then(onFulfilled);
        Promise.resolve(values.thenableReject).then(assert.fail, onFulfilled);
        Promise.resolve(values.promiseFulfilled).then(onFulfilled);
        Promise.resolve(values.promiseRejected).then(assert.fail, onFulfilled);
        Promise.resolve(values.promiseEventual).then(onFulfilled);
        async = true;
    });
});

describe("PromiseResolver.resolve", function() {
    specify("follows thenables and promises", function(done) {
        done = expect(6, done);
        var values = getValues();
        var async = false;

        function onFulfilled(v) {
            assert(v === 3);
            assert(async);
            done();
        }

        var d1 = Promise.defer();
        var d2 = Promise.defer();
        var d3 = Promise.defer();
        var d4 = Promise.defer();
        var d5 = Promise.defer();
        var d6 = Promise.defer();

        d1.resolve(values.value);
        d1.promise.then(onFulfilled);
        d2.resolve(values.thenableFulfill);
        d2.promise.then(onFulfilled);
        d3.resolve(values.thenableReject);
        d3.promise.then(assert.fail, onFulfilled);
        d4.resolve(values.promiseFulfilled);
        d4.promise.then(onFulfilled);
        d5.resolve(values.promiseRejected);
        d5.promise.then(assert.fail, onFulfilled);
        d6.resolve(values.promiseEventual);
        d6.promise.then(onFulfilled);
        async = true;
    });
});

describe("Cast thenable", function() {

    var a = {
        then: function(fn){
            fn(a);
        }
    };

    var b = {
        then: function(f, fn){
            fn(b);
        }
    };

    specify("fulfills with itself", function(done) {
        var promise = Promise.cast(a);

        promise.then(assert.fail).caught(Promise.TypeError, function(){
            done();
        });
    });

    specify("rejects with itself", function(done) {
        var promise = Promise.cast(b);

        promise.caught(function(v){
           assert(v === b);
           done();
        });
    });
});

describe("Implicitly cast thenable", function() {

    var a = {
        then: function(fn){
            fn(a);
        }
    };

    var b = {
        then: function(f, fn){
            fn(b);
        }
    };

    specify("fulfills with itself", function(done) {
        Promise.fulfilled().then(function(){
            return a;
        }).caught(Promise.TypeError, function(){
            done();
        });
    });

    specify("rejects with itself", function(done) {
        Promise.fulfilled().then(function(){
            return b;
        }).caught(function(v){
            assert(v === b);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],128:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;



describe("If promise is reused to get at the value many times over the course of application", function() {
    var three = Promise.fulfilled(3);

    specify("It will not keep references to anything", function(done){
        var fn = function(){};
        var l = 256;
        while(l--) {
            three.then(fn, fn, fn);
            three.then(fn, fn, fn);
            three.then(fn, fn, fn);
            three.then(fn, fn, fn);
            three.then(fn, fn, fn);
        }

        setTimeout(function(){
            for( var i = 0; i < three._length() - 5; ++i) {
                assert( three[i] === void 0 );
            }
            done();
        }, 13);
    });

    specify("It will be able to reuse the space", function(done) {
        var fn = function(){};
        var prom = three.then(fn, fn, fn);

        var l = 256;
        while(l--) {
            three.then(fn, fn, fn);
            three.then(fn, fn, fn);
            three.then(fn, fn, fn);
            three.then(fn, fn, fn);
        }


        assert( three._promise0 === prom );
        assert( three._fulfillmentHandler0 === fn );
        assert( three._rejectionHandler0 === fn );
        assert( three._progressHandler0 === fn );
        assert( three._receiver0 === void 0 );

        three.then(function(){
            setTimeout(function(){
                assert(three._length() === 0);
                done();
            }, 13);
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],129:[function(require,module,exports){
var process=require("__browserify_process");"use strict";
var assert   = require("assert");
var schedule = require("../../js/debug/schedule");
var isNodeJS = typeof process !== "undefined" && typeof process.execPath === "string";

describe("schedule", function () {
    if (isNodeJS) {
        describe("for Node.js", function () {
            it("should preserve the active domain", function (done) {
                var domain       = require("domain");
                var activeDomain = domain.create();

                activeDomain.run(function () {
                    schedule(function () {
                        assert(domain.active);
                        assert.equal(domain.active, activeDomain);

                        done();
                    });
                });
            });
        });
    }
});

},{"../../js/debug/schedule":46,"__browserify_process":16,"assert":2,"domain":3}],130:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;


describe("Promise.some", function(){
    it("should reject on negative number", function(done){
        Promise.some([1,2,3], -1)
            .then(assert.fail)
            .caught(Promise.TypeError, function(){
                done();
            });
    });

    it("should reject on NaN", function(done){
        Promise.some([1,2,3], -0/0)
            .then(assert.fail)
            .caught(Promise.TypeError, function(){
                done();
            });
    });

    it("should reject on non-array", function(done){
        Promise.some({}, 2)
            .then(assert.fail)
            .caught(Promise.TypeError, function(){
                done();
            });
    });

    it("should reject with rangeerror when impossible to fulfill", function(done){
        Promise.some([1,2,3], 4)
            .then(assert.fail)
            .caught(Promise.RangeError, function(e){
                done();
            });
    });

    it("should fulfill with empty array with 0", function(done){
        Promise.some([1,2,3], 0).then(function(result){
            assert.deepEqual(result, []);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],131:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var Promise = adapter;
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

describe("tap", function () {
    specify("passes through value", function(done) {
        Promise.resolve("test").tap(function() {
            return 3;
        }).then(function(value){
            assert.equal(value, "test");
            done();
        });
    });

    specify("passes through value after returned promise is fulfilled", function(done) {
        var async = false;
        Promise.resolve("test").tap(function() {
            return new Promise(function(r) {
                setTimeout(function(){
                    async = true;
                    r(3);
                }, 13);
            });
        }).then(function(value){
            assert(async);
            assert.equal(value, "test");
            done();
        });
    });

    specify("is not called on rejected promise", function(done) {
        var called = false;
        Promise.reject("test").tap(function() {
            called = true;
        }).caught(function(value){
            assert(!called);
            done();
        });
    });

    specify("passes immediate rejection", function(done) {
        var err = new Error();
        Promise.resolve("test").tap(function() {
            throw err;
        }).tap(assert.fail).caught(function(e){
            assert(err === e);
            done();
        });
    });

    specify("passes eventual rejection", function(done) {
        var err = new Error();
        Promise.resolve("test").tap(function() {
            return new Promise(function(_, rej) {
                setTimeout(function(){
                    rej(err);
                }, 13)
            });
        }).tap(assert.fail).caught(function(e) {
            assert(err === e);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],132:[function(require,module,exports){
"use strict";
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var Q = Promise;
/*
Copyright 2009–2012 Kristopher Michael Kowal. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/

describe("timeout", function () {
    it("should do nothing if the promise fulfills quickly", function (done) {
        Q.delay(10).timeout(200).then(function(){
            done();
        });
    });

    it("should do nothing if the promise rejects quickly", function (done) {
        var goodError = new Error("haha!");
        Q.delay(10)
        .then(function () {
            throw goodError;
        })
        .timeout(200)
        .then(undefined, function (error) {
            assert(error === goodError);
            done();
        });
    });

    it("should reject with a timeout error if the promise is too slow", function (done) {
        Q.delay(100)
        .timeout(10)
        .caught(Promise.TimeoutError, function(){
            done();
        })
    });

    it("should pass through progress notifications", function (done) {
        var deferred = Q.defer();

        var progressValsSeen = [];
        var promise = Q.resolve(deferred.promise).timeout(300).then(function () {
            assert.deepEqual(progressValsSeen, [1, 2, 3]);
            done();
        }, undefined, function (progressVal) {
            progressValsSeen.push(progressVal);
        });

        Q.resolve().then(function(){
            deferred.progress(1);
            deferred.progress(2);
            deferred.progress(3);
            deferred.resolve();
        });
    });

    it("should reject with a custom timeout error if the promise is too slow and msg was provided", function (done) {
        Q.delay(100)
        .timeout(10, "custom")
        .caught(Promise.TimeoutError, function(e){
            assert(/custom/i.test(e.message));
            done();
        });
    });

    it("should propagate the timeout error to cancellable parents", function(done) {
        function doExpensiveOp() {
            return new Promise(function() {

            })
            .cancellable()
            .caught(Promise.TimeoutError, function(e) {
                done();
            })
        }

        doExpensiveOp().timeout(100);
    });
});

describe("delay", function () {
    it("should delay fulfillment", function (done) {
        var promise = Q.delay(80);

        setTimeout(function () {
            assert(promise.isPending())
            setTimeout(function(){
                assert(promise.isFulfilled());
                done();
            }, 80);
        }, 30);
    });

    it("should not delay rejection", function (done) {
        var promise = Q.reject(5).delay(50);

        promise.caught(function(){});

        Q.delay(20).then(function () {
            assert(!promise.isPending());
            done();
        });
    });

    it("should treat a single argument as a time", function (done) {
        var promise = Q.delay(50);

        setTimeout(function () {
            assert(promise.isPending());
            done();
        }, 40);

    });

    it("should treat two arguments as a value + a time", function (done) {
        var promise = Q.delay("what", 50);

        setTimeout(function () {
            assert(promise.isPending());
        }, 25);

        promise.then(function (value) {
            assert(value === "what");
            done();
        });
    });

    it("should delay after resolution", function () {
        var promise1 = Q.delay("what", 30);
        var promise2 = promise1.delay(30);

        setTimeout(function () {
            assert(!promise1.isPending())
            assert(promise2.isPending());
        }, 40);

        return promise2.then(function (value) {
            assert(value === "what");
        });
    });

    it("should pass through progress notifications from passed promises", function (done) {
        var deferred = Q.defer();

        var progressValsSeen = [];
        var promise = Q.delay(deferred.promise, 100).then(function () {
            assert.deepEqual(progressValsSeen, [1, 2, 3]);
            done();
        }, undefined, function (progressVal) {
            progressValsSeen.push(progressVal);
        });

        Q.delay(5).then(function () { deferred.progress(1); });
        Q.delay(15).then(function () { deferred.progress(2); });
        Q.delay(25).then(function () { deferred.progress(3); });
        Q.delay(35).then(function () { deferred.resolve(); });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],133:[function(require,module,exports){
"use strict";

var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;

var obj = {};
var error = new Error();
var thrower = function() {
    throw error;
};

var identity = function(val) {
    return val;
};

var array = function() {
    return [].slice.call(arguments);
};

var receiver = function() {
    return this;
};

var tryy = Promise["try"];

describe("Promise.try", function(){
    specify("should reject when the function throws", function(done) {
        var async = false;
        tryy(thrower).then(assert.fail, function(e) {
            assert(async);
            assert(e === error);
            done();
        });
        async = true;
    });
    specify("should reject when the function is not a function", function(done) {
        var async = false;
        tryy(null).then(assert.fail, function(e) {
            assert(async);
            assert(e instanceof Promise.TypeError);
            done();
        });
        async = true;
    });
    specify("should call the function with the given receiver", function(done){
        var async = false;
        tryy(receiver, void 0, obj).then(function(val) {
            assert(async);
            assert(val === obj);
            done();
        }, assert.fail);
        async = true;
    });
    specify("should call the function with the given value", function(done){
        var async = false;
        tryy(identity, obj).then(function(val) {
            assert(async);
            assert(val === obj);
            done();
        }, assert.fail);
        async = true;
    });
    specify("should apply the function if given value is array", function(done){
        var async = false;
        tryy(array, [1,2,3]).then(function(val) {
            assert(async);
            assert.deepEqual(val, [1,2,3]);
            done();
        }, assert.fail);
        async = true;
    });

    specify("should unwrap returned promise", function(done){
        var d = Promise.pending();

        tryy(function(){
            return d.promise;
        }).then(function(v){
            assert(v === 3);
            done();
        })

        setTimeout(function(){
            d.fulfill(3);
        }, 13);
    });
    specify("should unwrap returned thenable", function(done){

        tryy(function(){
            return {
                then: function(f, v) {
                    f(3);
                }
            }
        }).then(function(v){
            assert(v === 3);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],134:[function(require,module,exports){
"use strict";
var assert = require("assert");
var Promise = require("../../js/debug/bluebird.js");
var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

//Used in expressions like: onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
//If strict mode is supported NFEs work, if it is not, NFEs don't work but arguments.callee does
var isStrictModeSupported = (function() {
    try {
        new Function("'use strict'; with({});");
        return false;
    }
    catch(e) {
        return true;
    }
})();

Promise.onPossiblyUnhandledRejection(null);

//Since there is only a single handler possible at a time, older
//tests that are run just before this file could affect the results
//that's why there is 500ms limit in grunt file between each test
//beacuse the unhandled rejection handler will run within 100ms right now
function onUnhandledFail(testFunction) {
    Promise.onPossiblyUnhandledRejection(function(e) {
        //For IE7 debugging
        console.log(testFunction + "");
        Promise.onPossiblyUnhandledRejection(null);
        assert.fail("Reporting handled rejection as unhandled");
    });
}

function onUnhandledSucceed( done, testAgainst ) {
    Promise.onPossiblyUnhandledRejection(function(e){
         if( testAgainst !== void 0 ) {
            try {
                if( typeof testAgainst === "function" ) {
                    assert(testAgainst(e));
                }
                else {
                    assert.equal(testAgainst, e );
                }
            }
            catch(e) {
                Promise.onPossiblyUnhandledRejection(null);
                if( typeof testAgainst === "function" ) {
                    console.log("assertion failed: " + testAgainst);
                }
                else {
                    console.log("assertion failed: " + testAgainst +  "!== " + e);
                }
                return;
            }
         }
        setTimeout(function() {
            clearUnhandledHandler(done)();
        }, 50);
    });
}

function async(fn) {
    return function() {
        setTimeout(function(){fn()}, 13);
    };
}

function clearUnhandledHandler(done) {
    return function() {
        Promise.onPossiblyUnhandledRejection(null);
        done();
    };
};

function e() {
    var ret = new Error();
    ret.propagationTest = true;
    return ret;
}

function notE() {
    var rets = [{}, []];
    return rets[Math.random()*rets.length|0];
}


if( adapter.hasLongStackTraces() ) {
    describe("Will report rejections that are not handled in time", function() {


        specify("Immediately rejected not handled at all", function testFunction(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            promise.reject(e());
        });
        specify("Eventually rejected not handled at all", function testFunction(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            setTimeout(function(){
                promise.reject(e());
            }, 50);
        });



        specify("Immediately rejected handled too late", function testFunction(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            promise.reject(e());
            setTimeout( function() {
                promise.promise.caught(function(){});
            }, 120 );
        });
        specify("Eventually rejected handled too late", function testFunction(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            setTimeout(function(){
                promise.reject(e());
            }, 20);
            setTimeout( function() {
                promise.promise.caught(function(){});
            }, 160 );
        });
    });

    describe("Will report rejections that are code errors", function() {

        specify("Immediately fulfilled handled with erroneous code", function testFunction(done) {
            onUnhandledSucceed(done);
            var deferred = pending();
            var promise = deferred.promise;
            deferred.fulfill(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            });
        });
        specify("Eventually fulfilled handled with erroneous code", function testFunction(done) {
            onUnhandledSucceed(done);
            var deferred = pending();
            var promise = deferred.promise;
            setTimeout(function(){
                deferred.fulfill(null);
            }, 40);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            });
        });

        specify("Already fulfilled handled with erroneous code but then recovered and failed again", function testFunction(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var promise = fulfilled(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });
        });

        specify("Immediately fulfilled handled with erroneous code but then recovered and failed again", function testFunction(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var deferred = pending();
            var promise = deferred.promise;
            deferred.fulfill(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
                //Handling the type error here
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });
        });

        specify("Eventually fulfilled handled with erroneous code but then recovered and failed again", function testFunction(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var deferred = pending();
            var promise = deferred.promise;

            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
                //Handling the type error here
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });

            setTimeout(function(){
                deferred.fulfill(null);
            }, 40 );
        });

        specify("Already fulfilled handled with erroneous code but then recovered in a parallel handler and failed again", function testFunction(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var promise = fulfilled(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
            });

            promise.caught(function(e) {
                    assert.ok( e instanceof Promise.TypeError )
                //Handling the type error here
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });
        });
    });

}

describe("Will report rejections that are not instanceof Error", function() {

    specify("Immediately rejected with non instanceof Error", function testFunction(done) {
        onUnhandledSucceed(done);

        var failed = pending();
        failed.reject(notE());
    });


    specify("Eventually rejected with non instanceof Error", function testFunction(done) {
        onUnhandledSucceed(done);

        var failed = pending();

        setTimeout(function(){
            failed.reject(notE());
        }, 80 );
    });
});

describe("Will handle hostile rejection reasons like frozen objects", function() {

    specify("Immediately rejected with non instanceof Error", function testFunction(done) {
        onUnhandledSucceed(done, function(e) {
            return true;
        });


        var failed = pending();
        failed.reject(Object.freeze({}));
    });


    specify("Eventually rejected with non instanceof Error", function testFunction(done) {
        onUnhandledSucceed(done, function(e) {
            return e instanceof Error;
        });


        var failed = pending();

        setTimeout(function(){
            failed.reject(Object.freeze({}));
        }, 80 );
    });
});


describe("Will not report rejections that are handled in time", function() {


    specify("Already rejected handled", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
        var failed = rejected(e()).caught(async(clearUnhandledHandler(done)));
    });

    specify("Immediately rejected handled", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        var failed = pending();

        failed.promise.caught(async(clearUnhandledHandler(done)));

        failed.reject(e());
    });


    specify("Eventually rejected handled", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        var failed = pending();
        async(function() {
            failed.reject(e());
        })();
        failed.promise.caught(async(clearUnhandledHandler(done)));
    });

    specify("Already rejected handled in a deep sequence", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        var failed = rejected(e());

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(async(clearUnhandledHandler(done)));
    });

    specify("Immediately rejected handled in a deep sequence", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        var failed = pending();

        failed.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(async(clearUnhandledHandler(done)));


        failed.reject(e());
    });


    specify("Eventually handled in a deep sequence", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        var failed = pending();
        async(function(){
            failed.reject(e());
        })();
        failed.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(async(clearUnhandledHandler(done)));
    });


    specify("Already rejected handled in a middle parallel deep sequence", function testFunction(done) {
        var totalReported = 0;
        Promise.onPossiblyUnhandledRejection(function () {
            totalReported++;
            if (totalReported === 2) {
                setTimeout(function(){
                    assert.equal(totalReported, 2);
                    Promise.onPossiblyUnhandledRejection(null);
                    done();
                }, 13);
            }
        });

        var failed = rejected(e());

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});
    });


    specify("Immediately rejected handled in a middle parallel deep  sequence", function testFunction(done) {
        var totalReported = 0;
        Promise.onPossiblyUnhandledRejection(function () {
            totalReported++;
            if (totalReported === 2) {
                setTimeout(function(){
                    assert.equal(totalReported, 2);
                    Promise.onPossiblyUnhandledRejection(null);
                    done();
                }, 13);
            }
        });

        var failed = pending();

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.reject(e());
    });


    specify("Eventually handled in a middle parallel deep sequence", function testFunction(done) {
        var totalReported = 0;
        Promise.onPossiblyUnhandledRejection(function () {
            totalReported++;
            if (totalReported === 2) {
                setTimeout(function(){
                    assert.equal(totalReported, 2);
                    Promise.onPossiblyUnhandledRejection(null);
                    done();
                }, 13);
            }
        });

        var failed = pending();

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        setTimeout(function(){
            failed.reject(e());
        }, 13 );

    });
});

describe("immediate failures without .then", function testFunction(done) {
    var err = new Error('');
    specify("Promise.reject", function testFunction(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        Promise.reject(err);
    });

    specify("new Promise throw", function testFunction(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        new Promise(function() {
            throw err;
        });
    });

    specify("new Promise reject", function testFunction(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        new Promise(function(_, r) {
            r(err);
        });
    });

    specify("Promise.method", function testFunction(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        Promise.method(function() {
            throw err;
        })();
    });

    specify("Promise.all", function testFunction(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        Promise.all([Promise.reject(err)]);
    });
});


describe("immediate failures with .then", function testFunction(done) {
    var err = new Error('');
    specify("Promise.reject", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
        Promise.reject(err).caught(async(clearUnhandledHandler(done)));
    });

    specify("new Promise throw", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        new Promise(function() {
            throw err;
        }).caught(async(clearUnhandledHandler(done)));
    });

    specify("new Promise reject", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        new Promise(function(_, r) {
            r(err);
        }).caught(async(clearUnhandledHandler(done)));
    });

    specify("Promise.method", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        Promise.method(function() {
            throw err;
        })().caught(clearUnhandledHandler(async(done)));
    });

    specify("Promise.all", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        Promise.all([Promise.reject("err")])
            .caught(clearUnhandledHandler(async(done)));
    });


    specify("Promise.all many", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        Promise.all([Promise.reject("err"), Promise.reject("err2")])
            .caught(clearUnhandledHandler(async(done)));
    });

    specify("Promise.all many pending", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        var a = new Promise(function(v, w){
            setTimeout(function(){w("err");}, 4);
        });
        var b = new Promise(function(v, w){
            setTimeout(function(){w("err2");}, 4);
        });

        Promise.all([a, b])
            .caught(clearUnhandledHandler(async(done)));
    });

    specify("Already rejected promise for a collection", function testFunction(done){
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
        Promise.settle(Promise.reject(err))
            .caught(clearUnhandledHandler(async(done)));
    });
});

describe("gh-118", function() {
    specify("eventually rejected promise", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        Promise.resolve().then(function() {
            return new Promise(function(_, reject) {
                setTimeout(function() {
                    reject(13);
                }, 13);
            });
        }).caught(async(clearUnhandledHandler(done)));
    });

    specify("already rejected promise", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        Promise.resolve().then(function() {
            return Promise.reject(13);
        }).caught(async(clearUnhandledHandler(done)));
    });

    specify("immediately rejected promise", function testFunction(done) {
        onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);

        Promise.resolve().then(function() {
            return new Promise(function(_, reject) {
                reject(13);
            });
        }).caught(async(clearUnhandledHandler(done)));
    });
});

describe("Promise.onUnhandledRejectionHandled", function() {
    specify("should be called when unhandled promise is later handled", function(done) {
        var unhandledPromises = [];
        Promise.onPossiblyUnhandledRejection(function(reason, promise) {
            unhandledPromises.push({
                reason: reason,
                promise: promise
            });
        });

        Promise.onUnhandledRejectionHandled(function(promise) {
            assert.equal(unhandledPromises.length, 1);
            assert(unhandledPromises[0].promise === promise);
            assert(promise === a);
            assert(unhandledPromises[0].reason === reason);
            Promise.onUnhandledRejectionHandled(null);
            Promise.onPossiblyUnhandledRejection(null);
            done();
        });

        var reason = new Error("error");
        var a = new Promise(function(){
            throw reason;
        });
        setTimeout(function(){
            a.caught(function(){

            });
        }, 25);
    });
});

if (Promise.hasLongStackTraces()) {
    describe("Gives long stack traces for non-errors", function() {

        specify("string", function testFunction(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });


            new Promise(function(){
                throw "hello";
            });

        });

        specify("null", function testFunction(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            new Promise(function(resolve, reject){
                reject(null);
            });

        });

        specify("boolean", function testFunction(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            var d = Promise.defer();
            d.reject(true);
        });

        specify("undefined", function testFunction(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                throw void 0;
            });
        });

        specify("number", function testFunction(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                throw void 0;
            }).caught(function(e){return e === void 0}, function() {
                throw 3;
            });
        });

        specify("function", function testFunction(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                return Promise.reject(function(){});
            });
        });

        specify("pojo", function testFunction(done) {
            var OldPromise = require("./helpers/bluebird0_7_0.js");

            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                return OldPromise.rejected({});
            });
        });

        specify("Date", function testFunction(done) {
            var OldPromise = require("./helpers/bluebird0_7_0.js");

            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                return OldPromise.cast().then(function(){
                    throw new Date();
                });
            });
        });

        specify("Q", function testFunction(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.resolve(5).then(function(val){
                return "Hello";
            }).delay(5).then(function(val){
                return require("q")().then(function(){throw "Error"});
            });
        });
    });
}

describe("clear unhandled handler", function() {
    Promise.onPossiblyUnhandledRejection(null);
});

},{"../../js/debug/bluebird.js":21,"./helpers/bluebird0_7_0.js":107,"assert":2,"q":54}],135:[function(require,module,exports){
"use strict";
var assert = require("assert");

var Promise = require("../../js/debug/bluebird.js");

var using = Promise.using;
var delay = Promise.delay;
var error = new Error("");

function Resource() {
    this.isClosed = false;
    this.closesCalled = 0;
    this.commited = false;
    this.rollbacked = false;
}

Resource.prototype.commit = function () {
    if (this.commited || this.rollbacked) {
        throw new Error("was already commited or rolled back")
    }
    this.commited = true;
};

Resource.prototype.rollback = function () {
    if (this.commited || this.rollbacked) {
        throw new Error("was already commited or rolled back")
    }
    this.rollbacked = true;
};

Resource.prototype.closeAsync = function() {
    return delay(10).bind(this).then(this.close);
};

Resource.prototype.close = function() {
    this.closesCalled++;
    if (this.isClosed) {
        return;
    }
    this.isClosed = true;
};

Resource.prototype.closeError = function() {
    throw error;
};

Resource.prototype.query = function(value) {
    return Promise.delay(value, 50);
};

function _connect() {
    return new Promise(function(resolve) {
        setTimeout(function(){
            resolve(new Resource())
        }, 13);
    });
}

function connectCloseAsync(arr, value) {
    return _connect().disposer(function(resource){
        return resource.closeAsync().then(function() {
            arr.push(value);
        });
    });
}

function connect() {
    return _connect().disposer(Resource.prototype.close);
}

function connectCloseError() {
    return _connect().disposer(Resource.prototype.closeError);
}


function connectError() {
    return new Promise(function(resolve, reject) {
        setTimeout(function(){
            reject(error);
        }, 13);
    });
}

function transactionDisposer(tx, outcome) {
    outcome.isFulfilled() ? tx.commit() : tx.rollback();
}

function transaction() {
    return _connect().disposer(transactionDisposer);
}

describe("Promise.using", function() {
    specify("simple happy case", function(done) {
        var res;

        using(connect(), function(connection){
            res = connection;
        }).then(function() {
            assert(res.isClosed);
            assert.equal(res.closesCalled, 1);
            done();
        });
    });

    specify("simple async happy case", function(done) {
        var res;
        var async = false;

        using(connect(), function(connection) {
            res = connection;
            return delay(50).then(function() {
                async = true;
            });
        }).then(function() {
            assert(async);
            assert(res.isClosed);
            assert.equal(res.closesCalled, 1);
            done();
        });
    });

    specify("simple unhappy case", function(done) {
        var a = connect();
        var promise = a._promise;
        var b = connectError();
        using(b, a, function(a, b) {
            assert(false);
        }).catch(function() {
            assert(promise.value().isClosed);
            assert.equal(promise.value().closesCalled, 1);
            done();
        })
    });

    specify("calls async disposers sequentially", function(done) {
         var a = [];
         var _res3 = connectCloseAsync(a, 3);
         var _res2 = connectCloseAsync(a, 2);
         var _res1 = connectCloseAsync(a, 1);
         using(_res1, _res2, _res3, function(res1, res2, res3) {
            _res1 = res1;
            _res2 = res2;
            _res3 = res3;
         }).then(function() {
            assert.deepEqual(a, [1,2,3]);
            assert(_res1.isClosed);
            assert(_res2.isClosed);
            assert(_res3.isClosed);
            assert(_res1.closesCalled == 1);
            assert(_res2.closesCalled == 1);
            assert(_res3.closesCalled == 1);
            done();
         });
    });

    specify("calls async disposers sequentially when failing", function(done) {
         var a = [];
         var _res3 = connectCloseAsync(a, 3);
         var _res2 = connectCloseAsync(a, 2);
         var _res1 = connectCloseAsync(a, 1);
         var p1 = _res1.promise();
         var p2 = _res2.promise();
         var p3 = _res3.promise();
         var e = new Error();
         var promise = delay(50).thenThrow(e);
         using(_res1, _res2, _res3, promise, function() {

         }).caught(function(err) {
            assert.deepEqual(a, [1,2,3]);
            assert(p1.value().isClosed);
            assert(p2.value().isClosed);
            assert(p3.value().isClosed);
            assert(p1.value().closesCalled == 1);
            assert(p2.value().closesCalled == 1);
            assert(p3.value().closesCalled == 1);
            assert(e === err)
            done();
         });
    });

    specify("successful transaction", function(done) {
        var _tx;
        using(transaction(), function(tx) {
            _tx = tx;
            return tx.query(1).then(function() {
                return tx.query(2);
            })
        }).then(function(){
            assert(_tx.commited);
            assert(!_tx.rollbacked);
            done();
        });
    });

    specify("fail transaction", function(done) {
        var _tx;
        using(transaction(), function(tx) {
            _tx = tx;
            return tx.query(1).then(function() {
                throw new Error();
            })
        }).then(assert.fail, function(){
            assert(!_tx.commited);
            assert(_tx.rollbacked);
            done();
        });
    });
})

},{"../../js/debug/bluebird.js":21,"assert":2}],136:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
var p = new when(function(){}).constructor.prototype;

function fail() {
    assert.fail();
}

describe("when.all-test", function () {

    specify("should resolve empty input", function(done) {
        return when.all([]).then(
            function(result) {
                assert.deepEqual(result, []);
                done()
            }, fail
        );
    });

    specify("should resolve values array", function(done) {
        var input = [1, 2, 3];
        when.all(input).then(
            function(results) {
                assert.deepEqual(results, input);
                done()
            }, fail
        );
    });

    specify("should resolve promises array", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        when.all(input).then(
            function(results) {
                assert.deepEqual(results, [1, 2, 3]);
                done()
            }, fail
        );
    });

    specify("should not resolve sparse array input", function(done) {
        var input = [, 1, , 1, 1 ];
        when.all(input).then(
            function(results) {
                assert.deepEqual(results, [void 0, 1, void 0, 1, 1]);
                done()
            }, fail
        );
    });

    specify("should reject if any input promise rejects", function(done) {
        var input = [resolved(1), rejected(2), resolved(3)];
        when.all(input).then(
            fail,
            function(failed) {
                assert.deepEqual(failed, 2);
                done();
            }
        );
    });

    specify("should accept a promise for an array", function(done) {
        var expected, input;

        expected = [1, 2, 3];
        input = resolved(expected);

        when.all(input).then(
            function(results) {
                assert.deepEqual(results, expected);
                done()
            }, fail
        );
    });

    specify("should reject when input promise does not resolve to array", function(done) {
        when.all(resolved(1)).caught(TypeError, function(e){
            done();
        });
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],137:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
when.resolve = resolved;
when.reject = rejected;
when.defer = pending;
var sentinel = {};
var other = {};
var p = new when(function(){}).constructor.prototype;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}


describe("when.any-test", function () {

    specify("should resolve to empty array with empty input array", function(done) {
        var a = [];
        when.any(a).then(
            function(result) {
                assert(result !== a);
                assert.deepEqual(result, []);
                done();
            }, fail
        );
    });

    specify("should resolve with an input value", function(done) {
        var input = [1, 2, 3];
        when.any(input).then(
            function(result) {
                assert(contains(input, result));
                done();
            }, fail
        );
    });

    specify("should resolve with a promised input value", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        when.any(input).then(
            function(result) {
                assert(contains([1, 2, 3], result));
                done();
            }, fail
        );
    });

    specify("should reject with all rejected input values if all inputs are rejected", function(done) {
        var input = [rejected(1), rejected(2), rejected(3)];
        var promise = when.any(input);

        promise.then(
            fail,
            function(result) {
                //Cannot use deep equality in IE8 because non-enumerable properties are not
                //supported
                assert(result[0] === 1);
                assert(result[1] === 2);
                assert(result[2] === 3);
                done();
            }
        );
    });

    specify("should accept a promise for an array", function(done) {
        var expected, input;

        expected = [1, 2, 3];
        input = resolved(expected);

        when.any(input).then(
            function(result) {
                refute.equals(expected.indexOf(result), -1);
                done();
            }, fail
        );
    });

    specify("should allow zero handlers", function(done) {
        var input = [1, 2, 3];
        when.any(input).then(
            function(result) {
                assert(contains(input, result));
                done();
            }, fail
        );
    });

    specify("should resolve to empty array when input promise does not resolve to array", function(done) {
        when.any(resolved(1)).caught(TypeError, function(e){
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],138:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
when.resolve = resolved;
when.reject = rejected;
when.defer = pending;
var sentinel = {};
var other = {};
var p = new when(function(){}).constructor.prototype;
p = pending().constructor.prototype;
p.resolve = p.fulfill;
p.notify = p.progress;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}

function fakeResolved(val) {
    return {
        then: function(callback) {
            return fakeResolved(callback ? callback(val) : val);
        }
    };
}

function fakeRejected(reason) {
    return {
        then: function(callback, errback) {
            return errback ? fakeResolved(errback(reason)) : fakeRejected(reason);
        }
    };
}

describe("when.defer-test", function () {


    specify("should fulfill with an immediate value", function(done) {
        var d = when.defer();

        d.promise.then(
            function(val) {
                assert.equal(val, sentinel);
                done();
            },
            fail
        );

        d.resolve(sentinel);
    });

    //Not implemented
    /*
    specify("should fulfill with fulfilled promised", function(done) {
        var d = when.defer();

        d.promise.then(
            function(val) {
                assert.equal(val, sentinel);
                done();
            },
            fail
        );

        d.resolve(fakeResolved(sentinel));
    });


    specify("should reject with rejected promise", function(done) {
        var d = when.defer();

        d.promise.then(
            fail,
            function(val) {
                assert.equal(val, sentinel);
                done();
            }
        );

        d.resolve(fakeRejected(sentinel));
    });
    */
    specify("should return a promise for the resolution value", function(done) {
        var d = when.defer();

        d.resolve(sentinel);
        d.promise.then(
            function(returnedPromiseVal) {
                assert.deepEqual(returnedPromiseVal, sentinel);
                done();
            },
            fail
        );
    });

    specify("should return a promise for a promised resolution value", function(done) {
        var d = when.defer();

        d.resolve(when.resolve(sentinel))
        d.promise.then(
            function(returnedPromiseVal) {
                assert.deepEqual(returnedPromiseVal, sentinel);
                done();
            },
            fail
        );
    });

    specify("should return a promise for a promised rejection value", function(done) {
        var d = when.defer();

        // Both the returned promise, and the deferred's own promise should
        // be rejected with the same value
        d.resolve(when.reject(sentinel))
        d.promise.then(
            fail,
            function(returnedPromiseVal) {
                assert.deepEqual(returnedPromiseVal, sentinel);
                done();
            }
        );
    });

    specify("should invoke newly added callback when already resolved", function(done) {
        var d = when.defer();

        d.resolve(sentinel);

        d.promise.then(
            function(val) {
                assert.equal(val, sentinel);
                done();
            },
            fail
        );
    });



    specify("should reject with an immediate value", function(done) {
        var d = when.defer();

        d.promise.then(
            fail,
            function(val) {
                assert.equal(val, sentinel);
                done();
            }
        );

        d.reject(sentinel);
    });

    specify("should reject with fulfilled promised", function(done) {
        var d, expected;

        d = when.defer();
        expected = fakeResolved(sentinel);

        d.promise.then(
            fail,
            function(val) {
                assert.equal(val, expected);
                done();
            }
        );

        d.reject(expected);
    });

    specify("should reject with rejected promise", function(done) {
        var d, expected;

        d = when.defer();
        expected = fakeRejected(sentinel);

        d.promise.then(
            fail,
            function(val) {
                assert.equal(val, expected);
                done();
            }
        );

        d.reject(expected);
    });


    specify("should return a promise for the rejection value", function(done) {
        var d = when.defer();

        // Both the returned promise, and the deferred's own promise should
        // be rejected with the same value
        d.reject(sentinel);
        d.promise.then(
            fail,
            function(returnedPromiseVal) {
                assert.deepEqual(returnedPromiseVal, sentinel);
                done();
            }
        );
    });

    specify("should invoke newly added errback when already rejected", function(done) {
        var d = when.defer();

        d.reject(sentinel);

        d.promise.then(
            fail,
            function (val) {
                assert.deepEqual(val, sentinel);
                done();
            }
        );
    });



    specify("should notify of progress updates", function(done) {
        var d = when.defer();

        d.promise.then(
            fail,
            fail,
            function(val) {
                assert.equal(val, sentinel);
                done();
            }
        );

        d.notify(sentinel);
    });

    specify("should propagate progress to downstream promises", function(done) {
        var d = when.defer();

        d.promise
        .then(fail, fail,
            function(update) {
                return update;
            }
        )
        .then(fail, fail,
            function(update) {
                assert.equal(update, sentinel);
                done();
            }
        );

        d.notify(sentinel);
    });

    specify("should propagate transformed progress to downstream promises", function(done) {
        var d = when.defer();

        d.promise
        .then(fail, fail,
            function() {
                return sentinel;
            }
        )
        .then(fail, fail,
            function(update) {
                assert.equal(update, sentinel);
                done();
            }
        );

        d.notify(other);
    });

    specify("should propagate caught exception value as progress", function(done) {
        var d = when.defer();

        d.promise
        .then(fail, fail,
            function() {
                throw sentinel;
            }
        )
        .then(fail, fail,
            function(update) {
                assert.equal(update, sentinel);
                done();
            }
        );

        d.notify(other);
    });

    specify("should forward progress events when intermediary callback (tied to a resolved promise) returns a promise", function(done) {
        var d, d2;

        d = when.defer();
        d2 = when.defer();

        // resolve d BEFORE calling attaching progress handler
        d.resolve();

        d.promise.then(
            function() {
                var ret = pending();
                setTimeout(function(){
                    ret.notify(sentinel);
                }, 0)
                return ret.promise;
            }
        ).then(null, null,
            function onProgress(update) {
                assert.equal(update, sentinel);
                done();
            }
        );
    });

    specify("should forward progress events when intermediary callback (tied to an unresovled promise) returns a promise", function(done) {
        var d = when.defer();

        d.promise.then(
            function() {
                var ret = pending();
                setTimeout(function(){
                    ret.notify(sentinel);
                }, 0)
                return ret.promise;
            }
        ).then(null, null,
            function onProgress(update) {
                assert.equal(update, sentinel);
                done();
            }
        );

        // resolve d AFTER calling attaching progress handler
        d.resolve();
    });

    specify("should forward progress when resolved with another promise", function(done) {
        var d, d2;

        d = when.defer();
        d2 = when.defer();

        d.promise
        .then(fail, fail,
            function() {
                return sentinel;
            }
        )
        .then(fail, fail,
            function(update) {
                assert.equal(update, sentinel);
                done();
            }
        );

        d.resolve(d2.promise);

        d2.notify();
    });

    specify("should allow resolve after progress", function(done) {
        var d = when.defer();

        var progressed = false;
        d.promise.then(
            function() {
                assert(progressed);
                done();
            },
            fail,
            function() {
                progressed = true;
            }
        );

        d.notify();
        d.resolve();
    });

    specify("should allow reject after progress", function(done) {
        var d = when.defer();

        var progressed = false;
        d.promise.then(
            fail,
            function() {
                assert(progressed);
                done();
            },
            function() {
                progressed = true;
            }
        );

        d.notify();
        d.reject();
    });

    specify("should be indistinguishable after resolution", function() {
        var d, before, after;

        d = when.defer();

        before = d.notify(sentinel);
        d.resolve();
        after = d.notify(sentinel);

        assert.equal(before, after);
    });

    //definitely not implemented
    /*
    specify("should return a promise for passed-in resolution value when already resolved", function(done) {
        var d = when.defer();
        d.resolve(other);

        d.resolve(sentinel);
        d.promise.then(function(val) {
            assert.equal(val, sentinel);
            done();
        });
    });


    specify("should return a promise for passed-in rejection value when already resolved", function(done) {
        var d = when.defer();
        d.resolve(other);

        d.reject(sentinel)
        d.promise.then(
            fail,
            function(val) {
                assert.equal(val, sentinel);
                done();
            }
        );
    });

    specify("should return a promise for passed-in resolution value when already rejected", function(done) {
        var d = when.defer();
        d.reject(other);

        d.resolve(sentinel)
        d.promise.then(function(val) {
            assert.equal(val, sentinel);
            done();
        });
    });

    specify("should return a promise for passed-in rejection value when already rejected", function(done) {
        var d = when.defer();
        d.reject(other);

        d.reject(sentinel)
        d.promise.then(
            fail,
            function(val) {
                assert.equal(val, sentinel);
                done();
            }
        );
    });
    */

    specify("should return silently on progress when already resolved", function() {
        var d = when.defer();
        d.resolve();

        refute.defined(d.notify());
    });

    specify("should return silently on progress when already rejected", function() {
        var d = when.defer();
        d.reject();
        d.promise.caught(function(){});
        refute.defined(d.notify());
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],139:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
when.resolve = resolved;
when.reject = rejected;
when.defer = pending;
var sentinel = {};
var other = {};
var p = new when(function(){}).constructor.prototype;
p = pending().constructor.prototype;
p.resolve = p.fulfill;
p.notify = p.progress;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}

function fakeResolved(val) {
    return {
        then: function(callback) {
            return fakeResolved(callback ? callback(val) : val);
        }
    };
}

function fakeRejected(reason) {
    return {
        then: function(callback, errback) {
            return errback ? fakeResolved(errback(reason)) : fakeRejected(reason);
        }
    };
}

describe("when.join-test", function () {



    specify("should resolve empty input", function(done) {
        return when.join().then(
            function(result) {
                assert.deepEqual(result, []);
                done();
            },
            fail
        );
    });

    specify("should join values", function(done) {
        when.join(1, 2, 3).then(
            function(results) {
                assert.deepEqual(results, [1, 2, 3]);
                done();
            },
            fail
        );
    });

    specify("should join promises array", function(done) {
        when.join(resolved(1), resolved(2), resolved(3)).then(
            function(results) {
                assert.deepEqual(results, [1, 2, 3]);
                done();
            },
            fail
        );
    });

    specify("should join mixed array", function(done) {
        when.join(resolved(1), 2, resolved(3), 4).then(
            function(results) {
                assert.deepEqual(results, [1, 2, 3, 4]);
                done();
            },
            fail
        );
    });

    specify("should reject if any input promise rejects", function(done) {
        when.join(resolved(1), rejected(2), resolved(3)).then(
            fail,
            function(failed) {
                assert.deepEqual(failed, 2);
                done();
            }
        );
    });

    specify("should call last argument as a spread function", function(done) {
        when.join(resolved(1), resolved(2), resolved(3), function(a, b, c) {
            assert(a === 1);
            assert(b === 2);
            assert(c === 3);
            done();
        });
    });


    specify("gh-227", function(done) {
        function a() {
            return when.join(when.resolve(1), function () {
                throw new Error();
            });
        }

        a().caught(function(e) {
            done();
        });
    });

});

},{"../../js/debug/bluebird.js":21,"assert":2}],140:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
var reject = rejected;
var resolve = resolved;
when.resolve = resolved;
when.reject = rejected;
when.defer = pending;
var sentinel = {};
var other = {};
var p = new when(function(){}).constructor.prototype;
p = pending().constructor.prototype;
p.resolve = p.fulfill;
p.notify = p.progress;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}

function fakeResolved(val) {
    return {
        then: function(callback) {
            return fakeResolved(callback ? callback(val) : val);
        }
    };
}

function fakeRejected(reason) {
    return {
        then: function(callback, errback) {
            return errback ? fakeResolved(errback(reason)) : fakeRejected(reason);
        }
    };
}
var delay = function (val, ms) {
    var p = when.pending();
    setTimeout(function () {
        p.fulfill(val);
    }, ms);
    return p.promise
};

describe("when.map-test", function () {

    function mapper(val) {
        return val * 2;
    }

    function deferredMapper(val) {
        return delay(mapper(val), Math.random()*10);
    }

    specify("should map input values array", function(done) {
        var input = [1, 2, 3];
        when.map(input, mapper).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should map input promises array", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        when.map(input, mapper).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should map mixed input array", function(done) {
        var input = [1, resolved(2), 3];
        when.map(input, mapper).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should map input when mapper returns a promise", function(done) {
        var input = [1,2,3];
        when.map(input, deferredMapper).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should accept a promise for an array", function(done) {
        when.map(resolved([1, resolved(2), 3]), mapper).then(
            function(result) {
                assert.deepEqual(result, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should resolve to empty array when input promise does not resolve to an array", function(done) {
        when.map(resolved(123), mapper).caught(TypeError, function(e){
            done();
        });
    });

    specify("should map input promises when mapper returns a promise", function(done) {
        var input = [resolved(1),resolved(2),resolved(3)];
        when.map(input, mapper).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should reject when input contains rejection", function(done) {
        var input = [resolved(1), reject(2), resolved(3)];
        when.map(input, mapper).then(
            fail,
            function(result) {
                assert( result === 2 );
                done();
            }
        );
    });

    specify("should propagate progress", function(done) {
        var input = [1, 2, 3];
        var donecalls = 0;
        function donecall() {
            if( ++donecalls === 3 ) done();
        }

        when.map(input, function(x) {
            var d = when.pending();
            d.progress(x);
            setTimeout(d.fulfill.bind(d, x), 0);
            return d.promise;
        }).then(null, null, function(update) {
            assert(update.value === input.shift());
            donecall();
        });
    });

    specify("should propagate progress 2", function(done) {
         // Thanks @depeele for this test
        var input, ncall;

        input = [_resolver(1), _resolver(2), _resolver(3)];
        ncall = 0;

        function identity(x) {
            return x;
        }
        //This test didn't contain the mapper argument so I assume
        //when.js uses identity mapper in such cases.
        //In bluebird it's illegal to call Promise.map without mapper function
        return when.map(input, identity).then(function () {
            assert(ncall === 6);
            done();
        }, fail, function () {
            ncall++;
        });

        function _resolver(id) {
          var p = when.defer();

          setTimeout(function () {
            var loop, timer;

            loop = 0;
            timer = setInterval(function () {
              p.notify(id);
              loop++;
              if (loop === 2) {
                clearInterval(timer);
                p.resolve(id);
              }
            }, 1);
          }, 0);

          return p.promise;
        }

    });
});

describe("when.map-test with concurrency", function () {

    var concurrency = {concurrency: 2};

    function mapper(val) {
        return val * 2;
    }

    function deferredMapper(val) {
        return delay(mapper(val), Math.random()*10);
    }

    specify("should map input values array with concurrency", function(done) {
        var input = [1, 2, 3];
        when.map(input, mapper, concurrency).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should map input promises array with concurrency", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        when.map(input, mapper, concurrency).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should map mixed input array with concurrency", function(done) {
        var input = [1, resolved(2), 3];
        when.map(input, mapper, concurrency).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should map input when mapper returns a promise with concurrency", function(done) {
        var input = [1,2,3];
        when.map(input, deferredMapper, concurrency).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should accept a promise for an array with concurrency", function(done) {
        when.map(resolved([1, resolved(2), 3]), mapper, concurrency).then(
            function(result) {
                assert.deepEqual(result, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should resolve to empty array when input promise does not resolve to an array with concurrency", function(done) {
        when.map(resolved(123), mapper, concurrency).caught(TypeError, function(e){
            done();
        });
    });

    specify("should map input promises when mapper returns a promise with concurrency", function(done) {
        var input = [resolved(1),resolved(2),resolved(3)];
        when.map(input, mapper, concurrency).then(
            function(results) {
                assert.deepEqual(results, [2,4,6]);
                done();
            },
            fail
        );
    });

    specify("should reject when input contains rejection with concurrency", function(done) {
        var input = [resolved(1), reject(2), resolved(3)];
        when.map(input, mapper, concurrency).then(
            fail,
            function(result) {
                assert( result === 2 );
                done();
            }
        );
    });

    specify("should propagate progress with concurrency", function(done) {
        var input = [1, 2, 3];
        var donecalls = 0;
        function donecall() {
            if( ++donecalls === 3 ) done();
        }

        when.map(input, function(x) {
            var d = when.pending();
            d.progress(x);
            setTimeout(d.fulfill.bind(d, x), 0);
            return d.promise;
        }, concurrency).then(null, null, function(update) {
            assert(update.value === input.shift());
            donecall();
        });
    });

    specify("should propagate progress 2 with concurrency", function(done) {
         // Thanks @depeele for this test
        var input, ncall;

        input = [_resolver(1), _resolver(2), _resolver(3)];
        ncall = 0;

        function identity(x) {
            return x;
        }
        //This test didn't contain the mapper argument so I assume
        //when.js uses identity mapper in such cases.
        //In bluebird it's illegal to call Promise.map without mapper function
        return when.map(input, identity, concurrency).then(function () {
            assert(ncall === 6);
            done();
        }, fail, function () {
            ncall++;
        });

        function _resolver(id) {
          var p = when.defer();

          setTimeout(function () {
            var loop, timer;

            loop = 0;
            timer = setInterval(function () {
              p.notify(id);
              loop++;
              if (loop === 2) {
                clearInterval(timer);
                p.resolve(id);
              }
            }, 1);
          }, 0);

          return p.promise;
        }

    });


    specify("should not have more than 5 promises in flight", function(done) {
        var array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        var b = [];
        var delay = when.delay;
        var wasEmpty = false;
        var now = Date.now();
        when.map(array, function(value, index) {
            var d = index > 4 ? 0 : 100;
            return delay(d).then(function() {
                b.push(value);
            });
        }, {concurrency: 5}).then(function() {
            assert(wasEmpty);
            assert.deepEqual(b, [0, 1, 2, 3, 4, 10, 9, 8, 7, 6, 5]);
            done();
        });

        delay(33).then(function() {
            wasEmpty = b.length === 0;
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],141:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var Promise = adapter;
var resolved = Promise.fulfilled;
var rejected = Promise.rejected;
var reject = rejected;
var resolve = resolved;
Promise.resolve = resolved;
Promise.reject = rejected;
Promise.defer = pending;
var sentinel = {};
var other = {};
var p = new Promise(function(){}).constructor.prototype;
p = pending().constructor.prototype;
p.resolve = p.fulfill;
p.notify = p.progress;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}

function fakeResolved(val) {
    return {
        then: function(callback) {
            return fakeResolved(callback ? callback(val) : val);
        }
    };
}

function fakeRejected(reason) {
    return {
        then: function(callback, errback) {
            return errback ? fakeResolved(errback(reason)) : fakeRejected(reason);
        }
    };
}
var delay = function (val, ms) {
    var p = Promise.pending();
    setTimeout(function () {
        p.fulfill(val);
    }, ms);
    return p.promise
};

describe("Promise.reduce-test", function () {

    function plus(sum, val) {
        return sum + val;
    }

    function later(val) {
        return delay(val, Math.random() * 10);
    }


    specify("should reduce values without initial value", function(done) {
        Promise.reduce([1,2,3], plus).then(
            function(result) {
                assert.deepEqual(result, 6);
                done();
            },
            fail
        );
    });

    specify("should reduce values with initial value", function(done) {
        Promise.reduce([1,2,3], plus, 1).then(
            function(result) {
                assert.deepEqual(result, 7);
                done();
            },
            fail
        );
    });

    specify("should reduce values with initial promise", function(done) {
        Promise.reduce([1,2,3], plus, resolved(1)).then(
            function(result) {
                assert.deepEqual(result, 7);
                done();
            },
            fail
        );
    });

    specify("should reduce promised values without initial value", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        Promise.reduce(input, plus).then(
            function(result) {
                assert.deepEqual(result, 6);
                done();
            },
            fail
        );
    });

    specify("should reduce promised values with initial value", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        Promise.reduce(input, plus, 1).then(
            function(result) {
                assert.deepEqual(result, 7);
                done();
            },
            fail
        );
    });

    specify("should reduce promised values with initial promise", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        Promise.reduce(input, plus, resolved(1)).then(
            function(result) {
                assert.deepEqual(result, 7);
                done();
            },
            fail
        );
    });

    specify("should reduce empty input with initial value", function(done) {
        var input = [];
        Promise.reduce(input, plus, 1).then(
            function(result) {
                assert.deepEqual(result, 1);
                done();
            },
            fail
        );
    });

    specify("should reduce empty input with eventual promise", function(done) {
        Promise.reduce([], plus, Promise.delay(1, 50)).then(
            function(result) {
                assert.deepEqual(result, 1);
                done();
            },
            fail
        );
    });

    specify("should reduce empty input with initial promise", function(done) {
        Promise.reduce([], plus, resolved(1)).then(
            function(result) {
                assert.deepEqual(result, 1);
                done();
            },
            fail
        );
    });

    specify("should reject Promise input contains rejection", function(done) {
        var input = [resolved(1), reject(2), resolved(3)];
        Promise.reduce(input, plus, resolved(1)).then(
            fail,
            function(result) {
                assert.deepEqual(result, 2);
                done();
            }
        );
    });

    specify("should reduce to undefined with empty array", function(done) {
        Promise.reduce([], plus).then(function(r){
            assert(r === void 0);
            done();
        });
    });

    specify("should reduce to initial value with empty array", function(done) {
        Promise.reduce([], plus, sentinel).then(function(r){
            assert(r === sentinel);
            done();
        });
    });

    specify("should reduce in input order", function(done) {
        Promise.reduce([later(1), later(2), later(3)], plus, '').then(
            function(result) {
                assert.deepEqual(result, '123');
                done();
            },
            fail
        );
    });

    specify("should accept a promise for an array", function(done) {
        Promise.reduce(resolved([1, 2, 3]), plus, '').then(
            function(result) {
                assert.deepEqual(result, '123');
                done();
            },
            fail
        );
    });

    specify("should resolve to initialValue Promise input promise does not resolve to an array", function(done) {
        Promise.reduce(resolved(123), plus, 1).caught(TypeError, function(e){
            done();
        });
    });

    specify("should provide correct basis value", function(done) {
        function insertIntoArray(arr, val, i) {
            arr[i] = val;
            return arr;
        }

        Promise.reduce([later(1), later(2), later(3)], insertIntoArray, []).then(
            function(result) {
                assert.deepEqual(result, [1,2,3]);
                done();
            },
            fail
        );
    });

    describe("checks", function() {
        function later(val, ms) {
            return Promise.delay(val, ms);
        }

        function plus(sum, val) {
            return sum + val;
        }

        function plusDelayed(sum, val) {
            return Promise.delay(0).then(function() {
                return sum + val;
            });
        }

        function check(delay1, delay2, delay3) {
          return Promise.reduce([
            later(1, delay1),
            later(2, delay2),
            later(3, delay3)
          ], plus, '').then(function(result) {
            assert.deepEqual(result, '123');
          })
        }

        function checkDelayed(delay1, delay2, delay3) {
          return Promise.reduce([
            later(1, delay1),
            later(2, delay2),
            later(3, delay3)
          ], plusDelayed, '').then(function(result) {
            assert.deepEqual(result, '123');
          })
        }

        specify("16, 16, 16", function(done) {
            check(16, 16, 16).then(function() {
                done();
            });
        });

        specify("16, 16, 4", function (done) {
            check(16, 16, 4).then(function () {
                done();
            });
        });
        specify("4, 16, 16", function (done) {
            check(4, 16, 16).then(function () {
                done();
            });
        });
        specify("16, 4, 16", function (done) {
            check(16, 4, 16).then(function () {
                done();
            });
        });
        specify("16, 16, 4", function (done) {
            check(16, 16, 4).then(function () {
                done();
            });
        });
        specify("4, 4, 16", function (done) {
            check(4, 4, 16).then(function () {
                done();
            });
        });
        specify("16, 4, 4", function (done) {
            check(16, 4, 4).then(function () {
                done();
            });
        });
        specify("4, 16, 4", function (done) {
            check(4, 16, 4).then(function () {
                done();
            });
        });
        specify("4, 4, 4", function (done) {
            check(4, 4, 4).then(function () {
                done();
            });
        });


        specify("16, 16, 16", function(done) {
            checkDelayed(16, 16, 16).then(function() {
                done();
            });
        });

        specify("16, 16, 4", function (done) {
            checkDelayed(16, 16, 4).then(function () {
                done();
            });
        });
        specify("4, 16, 16", function (done) {
            checkDelayed(4, 16, 16).then(function () {
                done();
            });
        });
        specify("16, 4, 16", function (done) {
            checkDelayed(16, 4, 16).then(function () {
                done();
            });
        });
        specify("16, 16, 4", function (done) {
            checkDelayed(16, 16, 4).then(function () {
                done();
            });
        });
        specify("4, 4, 16", function (done) {
            checkDelayed(4, 4, 16).then(function () {
                done();
            });
        });
        specify("16, 4, 4", function (done) {
            checkDelayed(16, 4, 4).then(function () {
                done();
            });
        });
        specify("4, 16, 4", function (done) {
            checkDelayed(4, 16, 4).then(function () {
                done();
            });
        });
        specify("4, 4, 4", function (done) {
            checkDelayed(4, 4, 4).then(function () {
                done();
            });
        });

    })
});

},{"../../js/debug/bluebird.js":21,"assert":2}],142:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
var reject = rejected;
var resolve = resolved;
when.resolve = resolved;
when.reject = rejected;
when.defer = pending;
var sentinel = {};
var other = {};
var p = new when(function(){}).constructor.prototype;
p = pending().constructor.prototype;
p.resolve = p.fulfill;
p.notify = p.progress;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}

function fakeResolved(val) {
    return {
        then: function(callback) {
            return fakeResolved(callback ? callback(val) : val);
        }
    };
}

function fakeRejected(reason) {
    return {
        then: function(callback, errback) {
            return errback ? fakeResolved(errback(reason)) : fakeRejected(reason);
        }
    };
}

function assertFulfilled(p, v) {
    assert( p.value() === v );
}

function assertRejected(p, v) {
    assert( p.error() === v );
}

var delay = function (val, ms) {
    var p = when.pending();
    setTimeout(function () {
        p.fulfill(val);
    }, ms);
    return p.promise
};

describe("when.settle-test", function () {


    when.promise = function( rs ){
        var a = pending();
        rs(a);
        return a.promise;
    };


    specify("should settle empty array", function(done) {
        return when.settle([]).then(function(settled) {
            assert.deepEqual(settled.length, 0);
            done();
        });
    });

    specify("should reject if promise for input array rejects", function(done) {
        return when.settle(when.reject(sentinel)).then(
            fail,
            function(reason) {
                assert.equal(reason, sentinel);
                done();
            }
        );
    });

    specify("should settle values", function(done) {
        var array = [0, 1, sentinel];
        return when.settle(array).then(function(settled) {
            assertFulfilled(settled[0], 0);
            assertFulfilled(settled[1], 1);
            assertFulfilled(settled[2], sentinel);
            done();
        });
    });

    specify("should settle promises", function(done) {
        var array = [0, when.resolve(sentinel), when.reject(sentinel)];
        return when.settle(array).then(function(settled) {
            assertFulfilled(settled[0], 0);
            assertFulfilled(settled[1], sentinel);
            assertRejected(settled[2], sentinel);
            done();
        });
    });

    specify("returned promise should fulfill once all inputs settle", function(done) {
        var array, p1, p2, resolve, reject;

        p1 = when.promise(function(r) { resolve = function(a){r.fulfill(a);}; });
        p2 = when.promise(function(r) { reject = function(a){r.reject(a);}; });

        array = [0, p1, p2];

        setTimeout(function() { resolve(sentinel); }, 0);
        setTimeout(function() { reject(sentinel); }, 0);

        return when.settle(array).then(function(settled) {
            assertFulfilled(settled[0], 0);
            assertFulfilled(settled[1], sentinel);
            assertRejected(settled[2], sentinel);
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],143:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
var reject = rejected;
var resolve = resolved;
when.resolve = resolved;
when.reject = rejected;
when.defer = pending;
var sentinel = {};
var other = {};
var p = new when(function(){}).constructor.prototype;
p = pending().constructor.prototype;
p.resolve = p.fulfill;
p.notify = p.progress;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}

function fakeResolved(val) {
    return {
        then: function(callback) {
            return fakeResolved(callback ? callback(val) : val);
        }
    };
}

function fakeRejected(reason) {
    return {
        then: function(callback, errback) {
            return errback ? fakeResolved(errback(reason)) : fakeRejected(reason);
        }
    };
}

function assertFulfilled(p, v) {
    assert( p.value() === v );
}

function assertRejected(p, v) {
    assert( p.error() === v );
}

var delay = function (val, ms) {
    var p = when.pending();
    setTimeout(function () {
        p.fulfill(val);
    }, ms);
    return p.promise
};

function isSubset(subset, superset) {
    var i, subsetLen;

    subsetLen = subset.length;

    if (subsetLen > superset.length) {
        return false;
    }

    for(i = 0; i<subsetLen; i++) {
        if(!contains(superset, subset[i])) {
            return false;
        }
    }

    return true;
}

describe("when.some-test", function () {

    specify("should resolve empty input", function(done) {
        when.some([], 1).then(
            function(result) {
                assert.deepEqual(result, []);
                done();
            },
            fail
        )
    });

    specify("should resolve values array", function(done) {
        var input = [1, 2, 3];
        when.some(input, 2).then(
            function(results) {
                assert(isSubset(results, input));
                done();
            },
            fail
        )
    });

    specify("should resolve promises array", function(done) {
        var input = [resolved(1), resolved(2), resolved(3)];
        when.some(input, 2).then(
            function(results) {
                assert(isSubset(results, [1, 2, 3]));
                done();
            },
            fail
        )
    });

    specify("should not resolve sparse array input", function(done) {
        var input = [, 1, , 2, 3 ];
        when.some(input, 2).then(
            function(results) {
                assert.deepEqual(results, [void 0, 1]);
                done();
            },
            function() {
                console.error(arguments);
                fail();
            }
        )
    });

    specify("should reject with all rejected input values if resolving howMany becomes impossible", function(done) {
        var input = [resolved(1), rejected(2), rejected(3)];
        when.some(input, 2).then(
            fail,
            function(failed) {
                //Cannot use deep equality in IE8 because non-enumerable properties are not
                //supported
                assert(failed[0] === 2);
                assert(failed[1] === 3);
                done();
            }
        )
    });

    specify("should reject with aggregateError", function(done) {
        var input = [resolved(1), rejected(2), rejected(3)];
        var AggregateError = when.AggregateError;
        when.some(input, 2)
            .then(fail)
            .caught(AggregateError, function(e) {
                assert(e[0] === 2);
                assert(e[1] === 3);
                assert(e.length === 2);
                done();
            });
    });

    specify("aggregate error should be caught in .error", function(done) {
        var input = [resolved(1), rejected(2), rejected(3)];
        var AggregateError = when.AggregateError;
        when.some(input, 2)
            .then(fail)
            .error(function(e) {
                assert(e[0] === 2);
                assert(e[1] === 3);
                assert(e.length === 2);
                done();
            });
    });

    specify("should accept a promise for an array", function(done) {
        var expected, input;

        expected = [1, 2, 3];
        input = resolved(expected);

        when.some(input, 2).then(
            function(results) {
                assert.deepEqual(results.length, 2);
                done();
            },
            fail
        )
    });

    specify("should reject when input promise does not resolve to array", function(done) {
        when.some(resolved(1), 1).caught(TypeError, function(e){
            done();
        });
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}],144:[function(require,module,exports){
"use strict";
/*
Based on When.js tests

Open Source Initiative OSI - The MIT License

http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2011 Brian Cavalier

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/
var assert = require("assert");

var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;
var when = adapter;
var resolved = when.fulfilled;
var rejected = when.rejected;
var reject = rejected;
var resolve = resolved;
when.resolve = resolved;
when.reject = rejected;
when.defer = pending;
var sentinel = {};
var other = {};
var p = new when(function(){}).constructor.prototype;
p = pending().constructor.prototype;
p.resolve = p.fulfill;
p.notify = p.progress;

function fail() {
    assert.fail();
}

var refute = {
    defined: function(val) {
        assert( typeof val === "undefined" );
    },

    equals: function( a, b ) {
        assert.notDeepEqual( a, b );
    }
};

function contains(arr, result) {
    return arr.indexOf(result) > -1;
}

function fakeResolved(val) {
    return {
        then: function(callback) {
            return fakeResolved(callback ? callback(val) : val);
        }
    };
}

function fakeRejected(reason) {
    return {
        then: function(callback, errback) {
            return errback ? fakeResolved(errback(reason)) : fakeRejected(reason);
        }
    };
}

function assertFulfilled(p, v) {
    assert( p.value() === v );
}

function assertRejected(p, v) {
    assert( p.error() === v );
}

var delay = function (val, ms) {
    var p = when.pending();
    setTimeout(function () {
        p.fulfill(val);
    }, ms);
    return p.promise
};

describe("when.spread-test", function () {
    var slice = [].slice;

    specify("should return a promise", function(done) {
        assert( typeof (when.defer().promise.spread().then) === "function");
        done();
    });

    specify("should apply onFulfilled with array as argument list", function(done) {
        var expected = [1, 2, 3];
        return when.resolve(expected).spread(function() {
            assert.deepEqual(slice.call(arguments), expected);
            done();
        });
    });

    specify("should resolve array contents", function(done) {
        var expected = [when.resolve(1), 2, when.resolve(3)];
        return when.resolve(expected).spread(function() {
            assert.deepEqual(slice.call(arguments), [1, 2, 3]);
            done();
        });
    });

    specify("should reject if any item in array rejects", function(done) {
        var expected = [when.resolve(1), 2, when.reject(3)];
        return when.resolve(expected)
            .spread(fail)
            .then(fail, function() { done();});
    });

    specify("should apply onFulfilled with array as argument list", function(done) {
        var expected = [1, 2, 3];
        return when.resolve(when.resolve(expected)).spread(function() {
            assert.deepEqual(slice.call(arguments), expected);
            done();
        });
    });

    specify("should resolve array contents", function(done) {
        var expected = [when.resolve(1), 2, when.resolve(3)];
        return when.resolve(when.resolve(expected)).spread(function() {
            assert.deepEqual(slice.call(arguments), [1, 2, 3]);
            done();
        });
    });

    specify("should reject if input is a rejected promise", function(done) {
        var expected = when.reject([1, 2, 3]);
        return when.resolve(expected)
            .spread(fail)
            .then(fail, function() { done();});
    });
});

},{"../../js/debug/bluebird.js":21,"assert":2}]},{},[17])
;