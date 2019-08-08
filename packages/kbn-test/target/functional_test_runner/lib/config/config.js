"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = void 0;

var _lodash = require("lodash");

var _toPath = _interopRequireDefault(require("lodash/internal/toPath"));

var _schema = require("./schema");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const $values = Symbol('values');

class Config {
  constructor(options) {
    _defineProperty(this, $values, void 0);

    const {
      settings = {},
      primary = false,
      path = null
    } = options || {};

    if (!path) {
      throw new TypeError('path is a required option');
    }

    const {
      error,
      value
    } = _schema.schema.validate(settings, {
      abortEarly: false,
      context: {
        primary: !!primary,
        path
      }
    });

    if (error) {
      throw error;
    }

    this[$values] = value;
  }

  has(key) {
    function recursiveHasCheck(remainingPath, values, childSchema) {
      if (!childSchema._inner) {
        return false;
      } // normalize child and pattern checks so we can iterate the checks in a single loop


      const checks = [// match children first, they have priority
      ...(childSchema._inner.children || []).map(child => ({
        test: k => child.key === k,
        schema: child.schema
      })), // match patterns on any key that doesn't match an explicit child
      ...(childSchema._inner.patterns || []).map(pattern => ({
        test: k => pattern.regex.test(k) && (0, _lodash.has)(values, k),
        schema: pattern.rule
      }))];

      for (const check of checks) {
        if (!check.test(remainingPath[0])) {
          continue;
        }

        if (remainingPath.length > 1) {
          return recursiveHasCheck(remainingPath.slice(1), (0, _lodash.get)(values, remainingPath[0]), check.schema);
        }

        return true;
      }

      return false;
    }

    const path = (0, _toPath.default)(key);

    if (!path.length) {
      return true;
    }

    return recursiveHasCheck(path, this[$values], _schema.schema);
  }

  get(key, defaultValue) {
    if (!this.has(key)) {
      throw new Error(`Unknown config key "${key}"`);
    }

    return (0, _lodash.cloneDeep)((0, _lodash.get)(this[$values], key, defaultValue), v => {
      if (typeof v === 'function') {
        return v;
      }
    });
  }

  getAll() {
    return (0, _lodash.cloneDeep)(this[$values], v => {
      if (typeof v === 'function') {
        return v;
      }
    });
  }

}

exports.Config = Config;