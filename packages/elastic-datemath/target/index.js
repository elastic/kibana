"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var unitsMap = {
  ms: {
    weight: 1,
    type: 'fixed',
    base: 1
  },
  s: {
    weight: 2,
    type: 'fixed',
    base: 1000
  },
  m: {
    weight: 3,
    type: 'mixed',
    base: 1000 * 60
  },
  h: {
    weight: 4,
    type: 'mixed',
    base: 1000 * 60 * 60
  },
  d: {
    weight: 5,
    type: 'mixed',
    base: 1000 * 60 * 60 * 24
  },
  w: {
    weight: 6,
    type: 'calendar',
    base: NaN
  },
  M: {
    weight: 7,
    type: 'calendar',
    base: NaN
  },
  // q: { weight: 8, type: 'calendar' }, // TODO: moment duration does not support quarter
  y: {
    weight: 9,
    type: 'calendar',
    base: NaN
  }
};
var units = Object.keys(unitsMap).sort(function (a, b) {
  return unitsMap[b].weight - unitsMap[a].weight;
});

var unitsDesc = _toConsumableArray(units);

var unitsAsc = _toConsumableArray(units).reverse();

var isDate = function isDate(d) {
  return Object.prototype.toString.call(d) === '[object Date]';
};

var isValidDate = function isValidDate(d) {
  return isDate(d) && !isNaN(d.valueOf());
};
/*
 * This is a simplified version of elasticsearch's date parser.
 * If you pass in a momentjs instance as the third parameter the calculation
 * will be done using this (and its locale settings) instead of the one bundled
 * with this library.
 */


function parse(text) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$roundUp = _ref.roundUp,
      roundUp = _ref$roundUp === void 0 ? false : _ref$roundUp,
      _ref$momentInstance = _ref.momentInstance,
      momentInstance = _ref$momentInstance === void 0 ? _moment.default : _ref$momentInstance,
      forceNow = _ref.forceNow;

  if (!text) return undefined;
  if (momentInstance.isMoment(text)) return text;
  if (isDate(text)) return momentInstance(text);

  if (forceNow !== undefined && !isValidDate(forceNow)) {
    throw new Error('forceNow must be a valid Date');
  }

  var time;
  var mathString = '';
  var index;
  var parseString;

  if (text.substring(0, 3) === 'now') {
    time = momentInstance(forceNow);
    mathString = text.substring('now'.length);
  } else {
    index = text.indexOf('||');

    if (index === -1) {
      parseString = text;
      mathString = ''; // nothing else
    } else {
      parseString = text.substring(0, index);
      mathString = text.substring(index + 2);
    } // We're going to just require ISO8601 timestamps, k?


    time = momentInstance(parseString);
  }

  if (!mathString.length) {
    return time;
  }

  return parseDateMath(mathString, time, roundUp);
}

function parseDateMath(mathString, time, roundUp) {
  var dateTime = time;
  var len = mathString.length;
  var i = 0;

  while (i < len) {
    var c = mathString.charAt(i++);
    var type = void 0;
    var num = void 0;
    var unit = void 0;

    if (c === '/') {
      type = 0;
    } else if (c === '+') {
      type = 1;
    } else if (c === '-') {
      type = 2;
    } else {
      return;
    }

    if (isNaN(mathString.charAt(i))) {
      num = 1;
    } else if (mathString.length === 2) {
      num = mathString.charAt(i);
    } else {
      var numFrom = i;

      while (!isNaN(mathString.charAt(i))) {
        i++;
        if (i >= len) return;
      }

      num = parseInt(mathString.substring(numFrom, i), 10);
    }

    if (type === 0) {
      // rounding is only allowed on whole, single, units (eg M or 1M, not 0.5M or 2M)
      if (num !== 1) {
        return;
      }
    }

    unit = mathString.charAt(i++); // append additional characters in the unit

    for (var j = i; j < len; j++) {
      var unitChar = mathString.charAt(i);

      if (/[a-z]/i.test(unitChar)) {
        unit += unitChar;
        i++;
      } else {
        break;
      }
    }

    if (units.indexOf(unit) === -1) {
      return;
    } else {
      if (type === 0) {
        if (roundUp) dateTime.endOf(unit);else dateTime.startOf(unit);
      } else if (type === 1) {
        dateTime.add(num, unit);
      } else if (type === 2) {
        dateTime.subtract(num, unit);
      }
    }
  }

  return dateTime;
}

var _default = {
  parse: parse,
  unitsMap: Object.freeze(unitsMap),
  units: Object.freeze(units),
  unitsAsc: Object.freeze(unitsAsc),
  unitsDesc: Object.freeze(unitsDesc)
};
exports.default = _default;
module.exports = exports.default;