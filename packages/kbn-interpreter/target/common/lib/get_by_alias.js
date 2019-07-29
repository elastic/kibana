"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getByAlias = getByAlias;

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

/**
 * This is used for looking up function/argument definitions. It looks through
 * the given object/array for a case-insensitive match, which could be either the
 * `name` itself, or something under the `aliases` property.
 */
function getByAlias(specs, name) {
  var lowerCaseName = name.toLowerCase();
  return Object.values(specs).find(function (_ref) {
    var name = _ref.name,
        aliases = _ref.aliases;
    if (name.toLowerCase() === lowerCaseName) return true;
    return (aliases || []).some(function (alias) {
      return alias.toLowerCase() === lowerCaseName;
    });
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21tb24vbGliL2dldF9ieV9hbGlhcy5qcyJdLCJuYW1lcyI6WyJnZXRCeUFsaWFzIiwic3BlY3MiLCJuYW1lIiwibG93ZXJDYXNlTmFtZSIsInRvTG93ZXJDYXNlIiwiT2JqZWN0IiwidmFsdWVzIiwiZmluZCIsImFsaWFzZXMiLCJzb21lIiwiYWxpYXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW1CQTs7Ozs7QUFLTyxTQUFTQSxVQUFULENBQW9CQyxLQUFwQixFQUEyQkMsSUFBM0IsRUFBaUM7QUFDdEMsTUFBTUMsYUFBYSxHQUFHRCxJQUFJLENBQUNFLFdBQUwsRUFBdEI7QUFDQSxTQUFPQyxNQUFNLENBQUNDLE1BQVAsQ0FBY0wsS0FBZCxFQUFxQk0sSUFBckIsQ0FBMEIsZ0JBQXVCO0FBQUEsUUFBcEJMLElBQW9CLFFBQXBCQSxJQUFvQjtBQUFBLFFBQWRNLE9BQWMsUUFBZEEsT0FBYztBQUN0RCxRQUFJTixJQUFJLENBQUNFLFdBQUwsT0FBdUJELGFBQTNCLEVBQTBDLE9BQU8sSUFBUDtBQUMxQyxXQUFPLENBQUNLLE9BQU8sSUFBSSxFQUFaLEVBQWdCQyxJQUFoQixDQUFxQixVQUFBQyxLQUFLLEVBQUk7QUFDbkMsYUFBT0EsS0FBSyxDQUFDTixXQUFOLE9BQXdCRCxhQUEvQjtBQUNELEtBRk0sQ0FBUDtBQUdELEdBTE0sQ0FBUDtBQU1EIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIExpY2Vuc2VkIHRvIEVsYXN0aWNzZWFyY2ggQi5WLiB1bmRlciBvbmUgb3IgbW9yZSBjb250cmlidXRvclxuICogbGljZW5zZSBhZ3JlZW1lbnRzLiBTZWUgdGhlIE5PVElDRSBmaWxlIGRpc3RyaWJ1dGVkIHdpdGhcbiAqIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgY29weXJpZ2h0XG4gKiBvd25lcnNoaXAuIEVsYXN0aWNzZWFyY2ggQi5WLiBsaWNlbnNlcyB0aGlzIGZpbGUgdG8geW91IHVuZGVyXG4gKiB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5XG4gKiBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuICogc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbiAqIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4gKiBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbiAqIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbiAqIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8qKlxuICogVGhpcyBpcyB1c2VkIGZvciBsb29raW5nIHVwIGZ1bmN0aW9uL2FyZ3VtZW50IGRlZmluaXRpb25zLiBJdCBsb29rcyB0aHJvdWdoXG4gKiB0aGUgZ2l2ZW4gb2JqZWN0L2FycmF5IGZvciBhIGNhc2UtaW5zZW5zaXRpdmUgbWF0Y2gsIHdoaWNoIGNvdWxkIGJlIGVpdGhlciB0aGVcbiAqIGBuYW1lYCBpdHNlbGYsIG9yIHNvbWV0aGluZyB1bmRlciB0aGUgYGFsaWFzZXNgIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QnlBbGlhcyhzcGVjcywgbmFtZSkge1xuICBjb25zdCBsb3dlckNhc2VOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhzcGVjcykuZmluZCgoeyBuYW1lLCBhbGlhc2VzIH0pID0+IHtcbiAgICBpZiAobmFtZS50b0xvd2VyQ2FzZSgpID09PSBsb3dlckNhc2VOYW1lKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gKGFsaWFzZXMgfHwgW10pLnNvbWUoYWxpYXMgPT4ge1xuICAgICAgcmV0dXJuIGFsaWFzLnRvTG93ZXJDYXNlKCkgPT09IGxvd2VyQ2FzZU5hbWU7XG4gICAgfSk7XG4gIH0pO1xufVxuIl19