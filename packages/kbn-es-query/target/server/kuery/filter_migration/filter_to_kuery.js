"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterToKueryAST = filterToKueryAST;

var _node_types = require("../node_types");

var _phrase = require("./phrase");

var _range = require("./range");

var _exists = require("./exists");

var _geo_bounding_box = require("./geo_bounding_box");

var _geo_polygon = require("./geo_polygon");

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
const conversionChain = [_phrase.convertPhraseFilter, _range.convertRangeFilter, _exists.convertExistsFilter, _geo_bounding_box.convertGeoBoundingBox, _geo_polygon.convertGeoPolygon];

function filterToKueryAST(filter) {
  const {
    negate
  } = filter.meta;
  const node = conversionChain.reduce((acc, converter) => {
    if (acc !== null) return acc;

    try {
      return converter(filter);
    } catch (ex) {
      return null;
    }
  }, null);

  if (!node) {
    throw new Error(`Couldn't convert that filter to a kuery`);
  }

  return negate ? _node_types.nodeTypes.function.buildNode('not', node) : node;
}