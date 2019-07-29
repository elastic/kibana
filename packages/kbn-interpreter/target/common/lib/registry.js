"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Registry = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _lodash = _interopRequireDefault(require("lodash.clone"));

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
var Registry =
/*#__PURE__*/
function () {
  function Registry() {
    var prop = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'name';
    (0, _classCallCheck2.default)(this, Registry);
    if (typeof prop !== 'string') throw new Error('Registry property name must be a string');
    this._prop = prop;
    this._indexed = new Object();
  }

  (0, _createClass2.default)(Registry, [{
    key: "wrapper",
    value: function wrapper(obj) {
      return obj;
    }
  }, {
    key: "register",
    value: function register(fn) {
      if (typeof fn !== 'function') throw new Error("Register requires an function");
      var obj = fn();

      if ((0, _typeof2.default)(obj) !== 'object' || !obj[this._prop]) {
        throw new Error("Registered functions must return an object with a ".concat(this._prop, " property"));
      }

      this._indexed[obj[this._prop].toLowerCase()] = this.wrapper(obj);
    }
  }, {
    key: "toJS",
    value: function toJS() {
      var _this = this;

      return Object.keys(this._indexed).reduce(function (acc, key) {
        acc[key] = _this.get(key);
        return acc;
      }, {});
    }
  }, {
    key: "toArray",
    value: function toArray() {
      var _this2 = this;

      return Object.keys(this._indexed).map(function (key) {
        return _this2.get(key);
      });
    }
  }, {
    key: "get",
    value: function get(name) {
      if (name === undefined) return null;
      var lowerCaseName = name.toLowerCase();
      return this._indexed[lowerCaseName] ? (0, _lodash.default)(this._indexed[lowerCaseName]) : null;
    }
  }, {
    key: "getProp",
    value: function getProp() {
      return this._prop;
    }
  }, {
    key: "reset",
    value: function reset() {
      this._indexed = new Object();
    }
  }]);
  return Registry;
}();

exports.Registry = Registry;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21tb24vbGliL3JlZ2lzdHJ5LmpzIl0sIm5hbWVzIjpbIlJlZ2lzdHJ5IiwicHJvcCIsIkVycm9yIiwiX3Byb3AiLCJfaW5kZXhlZCIsIk9iamVjdCIsIm9iaiIsImZuIiwidG9Mb3dlckNhc2UiLCJ3cmFwcGVyIiwia2V5cyIsInJlZHVjZSIsImFjYyIsImtleSIsImdldCIsIm1hcCIsIm5hbWUiLCJ1bmRlZmluZWQiLCJsb3dlckNhc2VOYW1lIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFtQkE7O0FBbkJBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFxQmFBLFE7OztBQUNYLHNCQUEyQjtBQUFBLFFBQWZDLElBQWUsdUVBQVIsTUFBUTtBQUFBO0FBQ3pCLFFBQUksT0FBT0EsSUFBUCxLQUFnQixRQUFwQixFQUE4QixNQUFNLElBQUlDLEtBQUosQ0FBVSx5Q0FBVixDQUFOO0FBQzlCLFNBQUtDLEtBQUwsR0FBYUYsSUFBYjtBQUNBLFNBQUtHLFFBQUwsR0FBZ0IsSUFBSUMsTUFBSixFQUFoQjtBQUNEOzs7OzRCQUVPQyxHLEVBQUs7QUFDWCxhQUFPQSxHQUFQO0FBQ0Q7Ozs2QkFFUUMsRSxFQUFJO0FBQ1gsVUFBSSxPQUFPQSxFQUFQLEtBQWMsVUFBbEIsRUFBOEIsTUFBTSxJQUFJTCxLQUFKLGlDQUFOO0FBRTlCLFVBQU1JLEdBQUcsR0FBR0MsRUFBRSxFQUFkOztBQUVBLFVBQUksc0JBQU9ELEdBQVAsTUFBZSxRQUFmLElBQTJCLENBQUNBLEdBQUcsQ0FBQyxLQUFLSCxLQUFOLENBQW5DLEVBQWlEO0FBQy9DLGNBQU0sSUFBSUQsS0FBSiw2REFBK0QsS0FBS0MsS0FBcEUsZUFBTjtBQUNEOztBQUVELFdBQUtDLFFBQUwsQ0FBY0UsR0FBRyxDQUFDLEtBQUtILEtBQU4sQ0FBSCxDQUFnQkssV0FBaEIsRUFBZCxJQUErQyxLQUFLQyxPQUFMLENBQWFILEdBQWIsQ0FBL0M7QUFDRDs7OzJCQUVNO0FBQUE7O0FBQ0wsYUFBT0QsTUFBTSxDQUFDSyxJQUFQLENBQVksS0FBS04sUUFBakIsRUFBMkJPLE1BQTNCLENBQWtDLFVBQUNDLEdBQUQsRUFBTUMsR0FBTixFQUFjO0FBQ3JERCxRQUFBQSxHQUFHLENBQUNDLEdBQUQsQ0FBSCxHQUFXLEtBQUksQ0FBQ0MsR0FBTCxDQUFTRCxHQUFULENBQVg7QUFDQSxlQUFPRCxHQUFQO0FBQ0QsT0FITSxFQUdKLEVBSEksQ0FBUDtBQUlEOzs7OEJBRVM7QUFBQTs7QUFDUixhQUFPUCxNQUFNLENBQUNLLElBQVAsQ0FBWSxLQUFLTixRQUFqQixFQUEyQlcsR0FBM0IsQ0FBK0IsVUFBQUYsR0FBRztBQUFBLGVBQUksTUFBSSxDQUFDQyxHQUFMLENBQVNELEdBQVQsQ0FBSjtBQUFBLE9BQWxDLENBQVA7QUFDRDs7O3dCQUVHRyxJLEVBQU07QUFDUixVQUFJQSxJQUFJLEtBQUtDLFNBQWIsRUFBd0IsT0FBTyxJQUFQO0FBQ3hCLFVBQU1DLGFBQWEsR0FBR0YsSUFBSSxDQUFDUixXQUFMLEVBQXRCO0FBQ0EsYUFBTyxLQUFLSixRQUFMLENBQWNjLGFBQWQsSUFBK0IscUJBQU0sS0FBS2QsUUFBTCxDQUFjYyxhQUFkLENBQU4sQ0FBL0IsR0FBcUUsSUFBNUU7QUFDRDs7OzhCQUVTO0FBQ1IsYUFBTyxLQUFLZixLQUFaO0FBQ0Q7Ozs0QkFFTztBQUNOLFdBQUtDLFFBQUwsR0FBZ0IsSUFBSUMsTUFBSixFQUFoQjtBQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIExpY2Vuc2VkIHRvIEVsYXN0aWNzZWFyY2ggQi5WLiB1bmRlciBvbmUgb3IgbW9yZSBjb250cmlidXRvclxuICogbGljZW5zZSBhZ3JlZW1lbnRzLiBTZWUgdGhlIE5PVElDRSBmaWxlIGRpc3RyaWJ1dGVkIHdpdGhcbiAqIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgY29weXJpZ2h0XG4gKiBvd25lcnNoaXAuIEVsYXN0aWNzZWFyY2ggQi5WLiBsaWNlbnNlcyB0aGlzIGZpbGUgdG8geW91IHVuZGVyXG4gKiB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5XG4gKiBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuICogc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbiAqIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4gKiBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbiAqIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbiAqIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCBjbG9uZSBmcm9tICdsb2Rhc2guY2xvbmUnO1xuXG5leHBvcnQgY2xhc3MgUmVnaXN0cnkge1xuICBjb25zdHJ1Y3Rvcihwcm9wID0gJ25hbWUnKSB7XG4gICAgaWYgKHR5cGVvZiBwcm9wICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IEVycm9yKCdSZWdpc3RyeSBwcm9wZXJ0eSBuYW1lIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICB0aGlzLl9wcm9wID0gcHJvcDtcbiAgICB0aGlzLl9pbmRleGVkID0gbmV3IE9iamVjdCgpO1xuICB9XG5cbiAgd3JhcHBlcihvYmopIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgcmVnaXN0ZXIoZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoYFJlZ2lzdGVyIHJlcXVpcmVzIGFuIGZ1bmN0aW9uYCk7XG5cbiAgICBjb25zdCBvYmogPSBmbigpO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8ICFvYmpbdGhpcy5fcHJvcF0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUmVnaXN0ZXJlZCBmdW5jdGlvbnMgbXVzdCByZXR1cm4gYW4gb2JqZWN0IHdpdGggYSAke3RoaXMuX3Byb3B9IHByb3BlcnR5YCk7XG4gICAgfVxuXG4gICAgdGhpcy5faW5kZXhlZFtvYmpbdGhpcy5fcHJvcF0udG9Mb3dlckNhc2UoKV0gPSB0aGlzLndyYXBwZXIob2JqKTtcbiAgfVxuXG4gIHRvSlMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2luZGV4ZWQpLnJlZHVjZSgoYWNjLCBrZXkpID0+IHtcbiAgICAgIGFjY1trZXldID0gdGhpcy5nZXQoa2V5KTtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xuICB9XG5cbiAgdG9BcnJheSgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5faW5kZXhlZCkubWFwKGtleSA9PiB0aGlzLmdldChrZXkpKTtcbiAgfVxuXG4gIGdldChuYW1lKSB7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgbG93ZXJDYXNlTmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gdGhpcy5faW5kZXhlZFtsb3dlckNhc2VOYW1lXSA/IGNsb25lKHRoaXMuX2luZGV4ZWRbbG93ZXJDYXNlTmFtZV0pIDogbnVsbDtcbiAgfVxuXG4gIGdldFByb3AoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb3A7XG4gIH1cblxuICByZXNldCgpIHtcbiAgICB0aGlzLl9pbmRleGVkID0gbmV3IE9iamVjdCgpO1xuICB9XG59XG4iXX0=