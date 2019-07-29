function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

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
import _ from 'lodash';
import * as ast from '../ast';
import * as literal from '../node_types/literal';
import * as wildcard from '../node_types/wildcard';
import { getPhraseScript } from '../../filters';
import { getFields } from './utils/get_fields';
import { getTimeZoneFromSettings } from '../../utils/get_time_zone_from_settings';
export function buildNodeParams(fieldName, value) {
  var isPhrase = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (_.isUndefined(fieldName)) {
    throw new Error('fieldName is a required argument');
  }

  if (_.isUndefined(value)) {
    throw new Error('value is a required argument');
  }

  var fieldNode = typeof fieldName === 'string' ? ast.fromLiteralExpression(fieldName) : literal.buildNode(fieldName);
  var valueNode = typeof value === 'string' ? ast.fromLiteralExpression(value) : literal.buildNode(value);
  var isPhraseNode = literal.buildNode(isPhrase);
  return {
    arguments: [fieldNode, valueNode, isPhraseNode]
  };
}
export function toElasticsearchQuery(node) {
  var indexPattern = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var _node$arguments = _slicedToArray(node.arguments, 3),
      fieldNameArg = _node$arguments[0],
      valueArg = _node$arguments[1],
      isPhraseArg = _node$arguments[2];

  var fieldName = ast.toElasticsearchQuery(fieldNameArg);
  var value = !_.isUndefined(valueArg) ? ast.toElasticsearchQuery(valueArg) : valueArg;
  var type = isPhraseArg.value ? 'phrase' : 'best_fields';

  if (fieldNameArg.value === null) {
    if (valueArg.type === 'wildcard') {
      return {
        query_string: {
          query: wildcard.toQueryStringQuery(valueArg)
        }
      };
    }

    return {
      multi_match: {
        type: type,
        query: value,
        lenient: true
      }
    };
  }

  var fields = indexPattern ? getFields(fieldNameArg, indexPattern) : []; // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
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

  var isExistsQuery = valueArg.type === 'wildcard' && value === '*';
  var isAllFieldsQuery = fieldNameArg.type === 'wildcard' && fieldName === '*' || fields && indexPattern && fields.length === indexPattern.fields.length;
  var isMatchAllQuery = isExistsQuery && isAllFieldsQuery;

  if (isMatchAllQuery) {
    return {
      match_all: {}
    };
  }

  var queries = fields.reduce(function (accumulator, field) {
    if (field.scripted) {
      // Exists queries don't make sense for scripted fields
      if (!isExistsQuery) {
        return [].concat(_toConsumableArray(accumulator), [{
          script: _objectSpread({}, getPhraseScript(field, value))
        }]);
      }
    } else if (isExistsQuery) {
      return [].concat(_toConsumableArray(accumulator), [{
        exists: {
          field: field.name
        }
      }]);
    } else if (valueArg.type === 'wildcard') {
      return [].concat(_toConsumableArray(accumulator), [{
        query_string: {
          fields: [field.name],
          query: wildcard.toQueryStringQuery(valueArg)
        }
      }]);
    }
    /*
      If we detect that it's a date field and the user wants an exact date, we need to convert the query to both >= and <= the value provided to force a range query. This is because match and match_phrase queries do not accept a timezone parameter.
      dateFormatTZ can have the value of 'Browser', in which case we guess the timezone using moment.tz.guess.
    */
    else if (field.type === 'date') {
        var timeZoneParam = config.dateFormatTZ ? {
          time_zone: getTimeZoneFromSettings(config.dateFormatTZ)
        } : {};
        return [].concat(_toConsumableArray(accumulator), [{
          range: _defineProperty({}, field.name, _objectSpread({
            gte: value,
            lte: value
          }, timeZoneParam))
        }]);
      } else {
        var queryType = type === 'phrase' ? 'match_phrase' : 'match';
        return [].concat(_toConsumableArray(accumulator), [_defineProperty({}, queryType, _defineProperty({}, field.name, value))]);
      }
  }, []);
  return {
    bool: {
      should: queries,
      minimum_should_match: 1
    }
  };
}