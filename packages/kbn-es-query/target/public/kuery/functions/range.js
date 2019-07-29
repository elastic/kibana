function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

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
import _ from 'lodash';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';
import { getRangeScript } from '../../filters';
import { getFields } from './utils/get_fields';
import { getTimeZoneFromSettings } from '../../utils/get_time_zone_from_settings';
export function buildNodeParams(fieldName, params) {
  params = _.pick(params, 'gt', 'lt', 'gte', 'lte', 'format');
  var fieldNameArg = typeof fieldName === 'string' ? ast.fromLiteralExpression(fieldName) : nodeTypes.literal.buildNode(fieldName);

  var args = _.map(params, function (value, key) {
    return nodeTypes.namedArg.buildNode(key, value);
  });

  return {
    arguments: [fieldNameArg].concat(_toConsumableArray(args))
  };
}
export function toElasticsearchQuery(node) {
  var indexPattern = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var _node$arguments = _toArray(node.arguments),
      fieldNameArg = _node$arguments[0],
      args = _node$arguments.slice(1);

  var fields = indexPattern ? getFields(fieldNameArg, indexPattern) : [];
  var namedArgs = extractArguments(args);

  var queryParams = _.mapValues(namedArgs, ast.toElasticsearchQuery); // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
  // the behaviour of lucene on dashboards where there are panels based on different index patterns that have different
  // fields. If a user queries on a field that exists in one pattern but not the other, the index pattern without the
  // field should return no results. It's debatable whether this is desirable, but it's been that way forever, so we'll
  // keep things familiar for now.


  if (fields && fields.length === 0) {
    fields.push({
      name: ast.toElasticsearchQuery(fieldNameArg),
      scripted: false
    });
  }

  var queries = fields.map(function (field) {
    if (field.scripted) {
      return {
        script: getRangeScript(field, queryParams)
      };
    } else if (field.type === 'date') {
      var timeZoneParam = config.dateFormatTZ ? {
        time_zone: getTimeZoneFromSettings(config.dateFormatTZ)
      } : {};
      return {
        range: _defineProperty({}, field.name, _objectSpread({}, queryParams, timeZoneParam))
      };
    }

    return {
      range: _defineProperty({}, field.name, queryParams)
    };
  });
  return {
    bool: {
      should: queries,
      minimum_should_match: 1
    }
  };
}

function extractArguments(args) {
  if (args.gt && args.gte || args.lt && args.lte) {
    throw new Error('range ends cannot be both inclusive and exclusive');
  }

  var unnamedArgOrder = ['gte', 'lte', 'format'];
  return args.reduce(function (acc, arg, index) {
    if (arg.type === 'namedArg') {
      acc[arg.name] = arg.value;
    } else {
      acc[unnamedArgOrder[index]] = arg;
    }

    return acc;
  }, {});
}