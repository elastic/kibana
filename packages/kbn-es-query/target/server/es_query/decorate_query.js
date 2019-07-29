"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decorateQuery = decorateQuery;

var _lodash = _interopRequireDefault(require("lodash"));

var _get_time_zone_from_settings = require("../utils/get_time_zone_from_settings");

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

/**
 * Decorate queries with default parameters
 * @param query object
 * @param queryStringOptions query:queryString:options from UI settings
 * @param dateFormatTZ dateFormat:tz from UI settings
 * @returns {object}
 */
function decorateQuery(query, queryStringOptions, dateFormatTZ = null) {
  if (_lodash.default.has(query, 'query_string.query')) {
    _lodash.default.extend(query.query_string, queryStringOptions);

    if (dateFormatTZ) {
      _lodash.default.defaults(query.query_string, {
        time_zone: (0, _get_time_zone_from_settings.getTimeZoneFromSettings)(dateFormatTZ)
      });
    }
  }

  return query;
}