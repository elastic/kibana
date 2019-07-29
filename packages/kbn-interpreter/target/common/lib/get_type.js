"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getType = getType;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

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
function getType(node) {
  if (node == null) return 'null';

  if ((0, _typeof2.default)(node) === 'object') {
    if (!node.type) throw new Error('Objects must have a type property');
    return node.type;
  }

  return (0, _typeof2.default)(node);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21tb24vbGliL2dldF90eXBlLmpzIl0sIm5hbWVzIjpbImdldFR5cGUiLCJub2RlIiwidHlwZSIsIkVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtQk8sU0FBU0EsT0FBVCxDQUFpQkMsSUFBakIsRUFBdUI7QUFDNUIsTUFBSUEsSUFBSSxJQUFJLElBQVosRUFBa0IsT0FBTyxNQUFQOztBQUNsQixNQUFJLHNCQUFPQSxJQUFQLE1BQWdCLFFBQXBCLEVBQThCO0FBQzVCLFFBQUksQ0FBQ0EsSUFBSSxDQUFDQyxJQUFWLEVBQWdCLE1BQU0sSUFBSUMsS0FBSixDQUFVLG1DQUFWLENBQU47QUFDaEIsV0FBT0YsSUFBSSxDQUFDQyxJQUFaO0FBQ0Q7O0FBRUQsK0JBQWNELElBQWQ7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBMaWNlbnNlZCB0byBFbGFzdGljc2VhcmNoIEIuVi4gdW5kZXIgb25lIG9yIG1vcmUgY29udHJpYnV0b3JcbiAqIGxpY2Vuc2UgYWdyZWVtZW50cy4gU2VlIHRoZSBOT1RJQ0UgZmlsZSBkaXN0cmlidXRlZCB3aXRoXG4gKiB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gcmVnYXJkaW5nIGNvcHlyaWdodFxuICogb3duZXJzaGlwLiBFbGFzdGljc2VhcmNoIEIuVi4gbGljZW5zZXMgdGhpcyBmaWxlIHRvIHlvdSB1bmRlclxuICogdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heVxuICogbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbiAqIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4gKiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuICogS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4gKiBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4gKiB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZShub2RlKSB7XG4gIGlmIChub2RlID09IG51bGwpIHJldHVybiAnbnVsbCc7XG4gIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ29iamVjdCcpIHtcbiAgICBpZiAoIW5vZGUudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdPYmplY3RzIG11c3QgaGF2ZSBhIHR5cGUgcHJvcGVydHknKTtcbiAgICByZXR1cm4gbm9kZS50eXBlO1xuICB9XG5cbiAgcmV0dXJuIHR5cGVvZiBub2RlO1xufVxuIl19