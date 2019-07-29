function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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
import { get } from 'lodash';
import * as literal from '../node_types/literal';
export function buildNodeParams(fieldName) {
  return {
    arguments: [literal.buildNode(fieldName)]
  };
}
export function toElasticsearchQuery(node, indexPattern) {
  var _node$arguments = _slicedToArray(node.arguments, 1),
      fieldNameArg = _node$arguments[0];

  var fieldName = literal.toElasticsearchQuery(fieldNameArg);
  var field = get(indexPattern, 'fields', []).find(function (field) {
    return field.name === fieldName;
  });

  if (field && field.scripted) {
    throw new Error("Exists query does not support scripted fields");
  }

  return {
    exists: {
      field: fieldName
    }
  };
}