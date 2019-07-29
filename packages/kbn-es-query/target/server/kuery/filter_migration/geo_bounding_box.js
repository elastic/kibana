"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertGeoBoundingBox = convertGeoBoundingBox;

var _lodash = _interopRequireDefault(require("lodash"));

var _node_types = require("../node_types");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
function convertGeoBoundingBox(filter) {
  if (filter.meta.type !== 'geo_bounding_box') {
    throw new Error(`Expected filter of type "geo_bounding_box", got "${filter.meta.type}"`);
  }

  const {
    key,
    params
  } = filter.meta;

  const camelParams = _lodash.default.mapKeys(params, (value, key) => _lodash.default.camelCase(key));

  return _node_types.nodeTypes.function.buildNode('geoBoundingBox', key, camelParams);
}