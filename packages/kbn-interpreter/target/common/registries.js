"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addRegistries = addRegistries;
exports.register = _register;
exports.registryFactory = registryFactory;

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
 * Add a new set of registries to an existing set of registries.
 *
 * @param {*} registries - The existing set of registries
 * @param {*} newRegistries - The new set of registries
 */
function addRegistries(registries, newRegistries) {
  Object.keys(newRegistries).forEach(function (registryName) {
    if (registries[registryName]) {
      throw new Error("There is already a registry named \"".concat(registryName, "\"."));
    }

    registries[registryName] = newRegistries[registryName];
  });
  return registries;
}
/**
 * Register a set of interpreter specs (functions, types, renderers, etc)
 *
 * @param {*} registries - The set of registries
 * @param {*} specs - The specs to be regsitered (e.g. { types: [], browserFunctions: [] })
 */


function _register(registries, specs) {
  Object.keys(specs).forEach(function (registryName) {
    if (!registries[registryName]) {
      throw new Error("There is no registry named \"".concat(registryName, "\"."));
    }

    if (!registries[registryName].register) {
      throw new Error("Registry \"".concat(registryName, "\" must have a register function."));
    }

    specs[registryName].forEach(function (f) {
      return registries[registryName].register(f);
    });
  });
  return registries;
}
/**
 * A convenience function for exposing registries and register in a plugin-friendly way
 * as a global in the browser, and as server.plugins.interpreter.register | registries
 * on the server.
 *
 * @param {*} registries - The registries to wrap.
 */


function registryFactory(_registries) {
  return {
    // This is a getter function. We can't make it a property or a proper
    // getter, because Kibana server will improperly clone it.
    registries: function registries() {
      return _registries;
    },
    register: function register(specs) {
      return _register(_registries, specs);
    }
  };
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21tb24vcmVnaXN0cmllcy5qcyJdLCJuYW1lcyI6WyJhZGRSZWdpc3RyaWVzIiwicmVnaXN0cmllcyIsIm5ld1JlZ2lzdHJpZXMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInJlZ2lzdHJ5TmFtZSIsIkVycm9yIiwicmVnaXN0ZXIiLCJzcGVjcyIsImYiLCJyZWdpc3RyeUZhY3RvcnkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JBOzs7Ozs7QUFNTyxTQUFTQSxhQUFULENBQXVCQyxVQUF2QixFQUFtQ0MsYUFBbkMsRUFBa0Q7QUFDdkRDLEVBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZRixhQUFaLEVBQTJCRyxPQUEzQixDQUFtQyxVQUFBQyxZQUFZLEVBQUk7QUFDakQsUUFBSUwsVUFBVSxDQUFDSyxZQUFELENBQWQsRUFBOEI7QUFDNUIsWUFBTSxJQUFJQyxLQUFKLCtDQUFnREQsWUFBaEQsU0FBTjtBQUNEOztBQUNETCxJQUFBQSxVQUFVLENBQUNLLFlBQUQsQ0FBVixHQUEyQkosYUFBYSxDQUFDSSxZQUFELENBQXhDO0FBQ0QsR0FMRDtBQU9BLFNBQU9MLFVBQVA7QUFDRDtBQUVEOzs7Ozs7OztBQU1PLFNBQVNPLFNBQVQsQ0FBa0JQLFVBQWxCLEVBQThCUSxLQUE5QixFQUFxQztBQUMxQ04sRUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlLLEtBQVosRUFBbUJKLE9BQW5CLENBQTJCLFVBQUFDLFlBQVksRUFBSTtBQUN6QyxRQUFJLENBQUNMLFVBQVUsQ0FBQ0ssWUFBRCxDQUFmLEVBQStCO0FBQzdCLFlBQU0sSUFBSUMsS0FBSix3Q0FBeUNELFlBQXpDLFNBQU47QUFDRDs7QUFFRCxRQUFJLENBQUNMLFVBQVUsQ0FBQ0ssWUFBRCxDQUFWLENBQXlCRSxRQUE5QixFQUF3QztBQUN0QyxZQUFNLElBQUlELEtBQUosc0JBQXVCRCxZQUF2Qix1Q0FBTjtBQUNEOztBQUNERyxJQUFBQSxLQUFLLENBQUNILFlBQUQsQ0FBTCxDQUFvQkQsT0FBcEIsQ0FBNEIsVUFBQUssQ0FBQztBQUFBLGFBQUlULFVBQVUsQ0FBQ0ssWUFBRCxDQUFWLENBQXlCRSxRQUF6QixDQUFrQ0UsQ0FBbEMsQ0FBSjtBQUFBLEtBQTdCO0FBQ0QsR0FURDtBQVdBLFNBQU9ULFVBQVA7QUFDRDtBQUVEOzs7Ozs7Ozs7QUFPTyxTQUFTVSxlQUFULENBQXlCVixXQUF6QixFQUFxQztBQUMxQyxTQUFPO0FBQ0w7QUFDQTtBQUNBQSxJQUFBQSxVQUhLLHdCQUdRO0FBQ1gsYUFBT0EsV0FBUDtBQUNELEtBTEk7QUFPTE8sSUFBQUEsUUFQSyxvQkFPSUMsS0FQSixFQU9XO0FBQ2QsYUFBT0QsU0FBUSxDQUFDUCxXQUFELEVBQWFRLEtBQWIsQ0FBZjtBQUNEO0FBVEksR0FBUDtBQVdEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIExpY2Vuc2VkIHRvIEVsYXN0aWNzZWFyY2ggQi5WLiB1bmRlciBvbmUgb3IgbW9yZSBjb250cmlidXRvclxuICogbGljZW5zZSBhZ3JlZW1lbnRzLiBTZWUgdGhlIE5PVElDRSBmaWxlIGRpc3RyaWJ1dGVkIHdpdGhcbiAqIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgY29weXJpZ2h0XG4gKiBvd25lcnNoaXAuIEVsYXN0aWNzZWFyY2ggQi5WLiBsaWNlbnNlcyB0aGlzIGZpbGUgdG8geW91IHVuZGVyXG4gKiB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5XG4gKiBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuICogc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbiAqIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4gKiBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbiAqIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbiAqIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cblxuLyoqXG4gKiBBZGQgYSBuZXcgc2V0IG9mIHJlZ2lzdHJpZXMgdG8gYW4gZXhpc3Rpbmcgc2V0IG9mIHJlZ2lzdHJpZXMuXG4gKlxuICogQHBhcmFtIHsqfSByZWdpc3RyaWVzIC0gVGhlIGV4aXN0aW5nIHNldCBvZiByZWdpc3RyaWVzXG4gKiBAcGFyYW0geyp9IG5ld1JlZ2lzdHJpZXMgLSBUaGUgbmV3IHNldCBvZiByZWdpc3RyaWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRSZWdpc3RyaWVzKHJlZ2lzdHJpZXMsIG5ld1JlZ2lzdHJpZXMpIHtcbiAgT2JqZWN0LmtleXMobmV3UmVnaXN0cmllcykuZm9yRWFjaChyZWdpc3RyeU5hbWUgPT4ge1xuICAgIGlmIChyZWdpc3RyaWVzW3JlZ2lzdHJ5TmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlcmUgaXMgYWxyZWFkeSBhIHJlZ2lzdHJ5IG5hbWVkIFwiJHtyZWdpc3RyeU5hbWV9XCIuYCk7XG4gICAgfVxuICAgIHJlZ2lzdHJpZXNbcmVnaXN0cnlOYW1lXSA9IG5ld1JlZ2lzdHJpZXNbcmVnaXN0cnlOYW1lXTtcbiAgfSk7XG5cbiAgcmV0dXJuIHJlZ2lzdHJpZXM7XG59XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBzZXQgb2YgaW50ZXJwcmV0ZXIgc3BlY3MgKGZ1bmN0aW9ucywgdHlwZXMsIHJlbmRlcmVycywgZXRjKVxuICpcbiAqIEBwYXJhbSB7Kn0gcmVnaXN0cmllcyAtIFRoZSBzZXQgb2YgcmVnaXN0cmllc1xuICogQHBhcmFtIHsqfSBzcGVjcyAtIFRoZSBzcGVjcyB0byBiZSByZWdzaXRlcmVkIChlLmcuIHsgdHlwZXM6IFtdLCBicm93c2VyRnVuY3Rpb25zOiBbXSB9KVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIocmVnaXN0cmllcywgc3BlY3MpIHtcbiAgT2JqZWN0LmtleXMoc3BlY3MpLmZvckVhY2gocmVnaXN0cnlOYW1lID0+IHtcbiAgICBpZiAoIXJlZ2lzdHJpZXNbcmVnaXN0cnlOYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGVyZSBpcyBubyByZWdpc3RyeSBuYW1lZCBcIiR7cmVnaXN0cnlOYW1lfVwiLmApO1xuICAgIH1cblxuICAgIGlmICghcmVnaXN0cmllc1tyZWdpc3RyeU5hbWVdLnJlZ2lzdGVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlZ2lzdHJ5IFwiJHtyZWdpc3RyeU5hbWV9XCIgbXVzdCBoYXZlIGEgcmVnaXN0ZXIgZnVuY3Rpb24uYCk7XG4gICAgfVxuICAgIHNwZWNzW3JlZ2lzdHJ5TmFtZV0uZm9yRWFjaChmID0+IHJlZ2lzdHJpZXNbcmVnaXN0cnlOYW1lXS5yZWdpc3RlcihmKSk7XG4gIH0pO1xuXG4gIHJldHVybiByZWdpc3RyaWVzO1xufVxuXG4vKipcbiAqIEEgY29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIGV4cG9zaW5nIHJlZ2lzdHJpZXMgYW5kIHJlZ2lzdGVyIGluIGEgcGx1Z2luLWZyaWVuZGx5IHdheVxuICogYXMgYSBnbG9iYWwgaW4gdGhlIGJyb3dzZXIsIGFuZCBhcyBzZXJ2ZXIucGx1Z2lucy5pbnRlcnByZXRlci5yZWdpc3RlciB8IHJlZ2lzdHJpZXNcbiAqIG9uIHRoZSBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIHsqfSByZWdpc3RyaWVzIC0gVGhlIHJlZ2lzdHJpZXMgdG8gd3JhcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdHJ5RmFjdG9yeShyZWdpc3RyaWVzKSB7XG4gIHJldHVybiB7XG4gICAgLy8gVGhpcyBpcyBhIGdldHRlciBmdW5jdGlvbi4gV2UgY2FuJ3QgbWFrZSBpdCBhIHByb3BlcnR5IG9yIGEgcHJvcGVyXG4gICAgLy8gZ2V0dGVyLCBiZWNhdXNlIEtpYmFuYSBzZXJ2ZXIgd2lsbCBpbXByb3Blcmx5IGNsb25lIGl0LlxuICAgIHJlZ2lzdHJpZXMoKSB7XG4gICAgICByZXR1cm4gcmVnaXN0cmllcztcbiAgICB9LFxuXG4gICAgcmVnaXN0ZXIoc3BlY3MpIHtcbiAgICAgIHJldHVybiByZWdpc3RlcihyZWdpc3RyaWVzLCBzcGVjcyk7XG4gICAgfSxcbiAgfTtcbn1cbiJdfQ==