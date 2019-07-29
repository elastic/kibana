"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Fn = Fn;

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _lodash = require("lodash");

var _arg = require("./arg");

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
function Fn(config) {
  var _this = this;

  // Required
  this.name = config.name; // Name of function
  // Return type of function.
  // This SHOULD be supplied. We use it for UI and autocomplete hinting,
  // We may also use it for optimizations in the future.

  this.type = config.type;
  this.aliases = config.aliases || []; // Function to run function (context, args)

  this.fn = function () {
    return Promise.resolve(config.fn.apply(config, arguments));
  }; // Optional


  this.help = config.help || ''; // A short help text

  this.args = (0, _lodash.mapValues)(config.args || {}, function (arg, name) {
    return new _arg.Arg((0, _objectSpread2.default)({
      name: name
    }, arg));
  });
  this.context = config.context || {};

  this.accepts = function (type) {
    if (!_this.context.types) return true; // If you don't tell us about context, we'll assume you don't care what you get

    return (0, _lodash.includes)(_this.context.types, type); // Otherwise, check it
  };
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21tb24vbGliL2ZuLmpzIl0sIm5hbWVzIjpbIkZuIiwiY29uZmlnIiwibmFtZSIsInR5cGUiLCJhbGlhc2VzIiwiZm4iLCJQcm9taXNlIiwicmVzb2x2ZSIsImhlbHAiLCJhcmdzIiwiYXJnIiwiQXJnIiwiY29udGV4dCIsImFjY2VwdHMiLCJ0eXBlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFtQkE7O0FBQ0E7O0FBcEJBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzQk8sU0FBU0EsRUFBVCxDQUFZQyxNQUFaLEVBQW9CO0FBQUE7O0FBQ3pCO0FBQ0EsT0FBS0MsSUFBTCxHQUFZRCxNQUFNLENBQUNDLElBQW5CLENBRnlCLENBRUE7QUFFekI7QUFDQTtBQUNBOztBQUNBLE9BQUtDLElBQUwsR0FBWUYsTUFBTSxDQUFDRSxJQUFuQjtBQUNBLE9BQUtDLE9BQUwsR0FBZUgsTUFBTSxDQUFDRyxPQUFQLElBQWtCLEVBQWpDLENBUnlCLENBVXpCOztBQUNBLE9BQUtDLEVBQUwsR0FBVTtBQUFBLFdBQWFDLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQk4sTUFBTSxDQUFDSSxFQUFQLE9BQUFKLE1BQU0sWUFBdEIsQ0FBYjtBQUFBLEdBQVYsQ0FYeUIsQ0FhekI7OztBQUNBLE9BQUtPLElBQUwsR0FBWVAsTUFBTSxDQUFDTyxJQUFQLElBQWUsRUFBM0IsQ0FkeUIsQ0FjTTs7QUFDL0IsT0FBS0MsSUFBTCxHQUFZLHVCQUFVUixNQUFNLENBQUNRLElBQVAsSUFBZSxFQUF6QixFQUE2QixVQUFDQyxHQUFELEVBQU1SLElBQU47QUFBQSxXQUFlLElBQUlTLFFBQUo7QUFBVVQsTUFBQUEsSUFBSSxFQUFKQTtBQUFWLE9BQW1CUSxHQUFuQixFQUFmO0FBQUEsR0FBN0IsQ0FBWjtBQUVBLE9BQUtFLE9BQUwsR0FBZVgsTUFBTSxDQUFDVyxPQUFQLElBQWtCLEVBQWpDOztBQUVBLE9BQUtDLE9BQUwsR0FBZSxVQUFBVixJQUFJLEVBQUk7QUFDckIsUUFBSSxDQUFDLEtBQUksQ0FBQ1MsT0FBTCxDQUFhRSxLQUFsQixFQUF5QixPQUFPLElBQVAsQ0FESixDQUNpQjs7QUFDdEMsV0FBTyxzQkFBUyxLQUFJLENBQUNGLE9BQUwsQ0FBYUUsS0FBdEIsRUFBNkJYLElBQTdCLENBQVAsQ0FGcUIsQ0FFc0I7QUFDNUMsR0FIRDtBQUlEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIExpY2Vuc2VkIHRvIEVsYXN0aWNzZWFyY2ggQi5WLiB1bmRlciBvbmUgb3IgbW9yZSBjb250cmlidXRvclxuICogbGljZW5zZSBhZ3JlZW1lbnRzLiBTZWUgdGhlIE5PVElDRSBmaWxlIGRpc3RyaWJ1dGVkIHdpdGhcbiAqIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgY29weXJpZ2h0XG4gKiBvd25lcnNoaXAuIEVsYXN0aWNzZWFyY2ggQi5WLiBsaWNlbnNlcyB0aGlzIGZpbGUgdG8geW91IHVuZGVyXG4gKiB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5XG4gKiBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuICogc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbiAqIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4gKiBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbiAqIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbiAqIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7IG1hcFZhbHVlcywgaW5jbHVkZXMgfSBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgQXJnIH0gZnJvbSAnLi9hcmcnO1xuXG5leHBvcnQgZnVuY3Rpb24gRm4oY29uZmlnKSB7XG4gIC8vIFJlcXVpcmVkXG4gIHRoaXMubmFtZSA9IGNvbmZpZy5uYW1lOyAvLyBOYW1lIG9mIGZ1bmN0aW9uXG5cbiAgLy8gUmV0dXJuIHR5cGUgb2YgZnVuY3Rpb24uXG4gIC8vIFRoaXMgU0hPVUxEIGJlIHN1cHBsaWVkLiBXZSB1c2UgaXQgZm9yIFVJIGFuZCBhdXRvY29tcGxldGUgaGludGluZyxcbiAgLy8gV2UgbWF5IGFsc28gdXNlIGl0IGZvciBvcHRpbWl6YXRpb25zIGluIHRoZSBmdXR1cmUuXG4gIHRoaXMudHlwZSA9IGNvbmZpZy50eXBlO1xuICB0aGlzLmFsaWFzZXMgPSBjb25maWcuYWxpYXNlcyB8fCBbXTtcblxuICAvLyBGdW5jdGlvbiB0byBydW4gZnVuY3Rpb24gKGNvbnRleHQsIGFyZ3MpXG4gIHRoaXMuZm4gPSAoLi4uYXJncykgPT4gUHJvbWlzZS5yZXNvbHZlKGNvbmZpZy5mbiguLi5hcmdzKSk7XG5cbiAgLy8gT3B0aW9uYWxcbiAgdGhpcy5oZWxwID0gY29uZmlnLmhlbHAgfHwgJyc7IC8vIEEgc2hvcnQgaGVscCB0ZXh0XG4gIHRoaXMuYXJncyA9IG1hcFZhbHVlcyhjb25maWcuYXJncyB8fCB7fSwgKGFyZywgbmFtZSkgPT4gbmV3IEFyZyh7IG5hbWUsIC4uLmFyZyB9KSk7XG5cbiAgdGhpcy5jb250ZXh0ID0gY29uZmlnLmNvbnRleHQgfHwge307XG5cbiAgdGhpcy5hY2NlcHRzID0gdHlwZSA9PiB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQudHlwZXMpIHJldHVybiB0cnVlOyAvLyBJZiB5b3UgZG9uJ3QgdGVsbCB1cyBhYm91dCBjb250ZXh0LCB3ZSdsbCBhc3N1bWUgeW91IGRvbid0IGNhcmUgd2hhdCB5b3UgZ2V0XG4gICAgcmV0dXJuIGluY2x1ZGVzKHRoaXMuY29udGV4dC50eXBlcywgdHlwZSk7IC8vIE90aGVyd2lzZSwgY2hlY2sgaXRcbiAgfTtcbn1cbiJdfQ==