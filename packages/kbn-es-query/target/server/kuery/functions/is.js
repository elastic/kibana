"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildNodeParams = buildNodeParams;
exports.toElasticsearchQuery = toElasticsearchQuery;

var _lodash = _interopRequireDefault(require("lodash"));

var ast = _interopRequireWildcard(require("../ast"));

var literal = _interopRequireWildcard(require("../node_types/literal"));

var wildcard = _interopRequireWildcard(require("../node_types/wildcard"));

var _filters = require("../../filters");

var _get_fields = require("./utils/get_fields");

var _get_time_zone_from_settings = require("../../utils/get_time_zone_from_settings");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function buildNodeParams(fieldName, value, isPhrase = false) {
  if (_lodash.default.isUndefined(fieldName)) {
    throw new Error('fieldName is a required argument');
  }

  if (_lodash.default.isUndefined(value)) {
    throw new Error('value is a required argument');
  }

  const fieldNode = typeof fieldName === 'string' ? ast.fromLiteralExpression(fieldName) : literal.buildNode(fieldName);
  const valueNode = typeof value === 'string' ? ast.fromLiteralExpression(value) : literal.buildNode(value);
  const isPhraseNode = literal.buildNode(isPhrase);
  return {
    arguments: [fieldNode, valueNode, isPhraseNode]
  };
}

function toElasticsearchQuery(node, indexPattern = null, config = {}) {
  const {
    arguments: [fieldNameArg, valueArg, isPhraseArg]
  } = node;
  const fieldName = ast.toElasticsearchQuery(fieldNameArg);
  const value = !_lodash.default.isUndefined(valueArg) ? ast.toElasticsearchQuery(valueArg) : valueArg;
  const type = isPhraseArg.value ? 'phrase' : 'best_fields';

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
        type,
        query: value,
        lenient: true
      }
    };
  }

  const fields = indexPattern ? (0, _get_fields.getFields)(fieldNameArg, indexPattern) : []; // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
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

  const isExistsQuery = valueArg.type === 'wildcard' && value === '*';
  const isAllFieldsQuery = fieldNameArg.type === 'wildcard' && fieldName === '*' || fields && indexPattern && fields.length === indexPattern.fields.length;
  const isMatchAllQuery = isExistsQuery && isAllFieldsQuery;

  if (isMatchAllQuery) {
    return {
      match_all: {}
    };
  }

  const queries = fields.reduce((accumulator, field) => {
    if (field.scripted) {
      // Exists queries don't make sense for scripted fields
      if (!isExistsQuery) {
        return [...accumulator, {
          script: _objectSpread({}, (0, _filters.getPhraseScript)(field, value))
        }];
      }
    } else if (isExistsQuery) {
      return [...accumulator, {
        exists: {
          field: field.name
        }
      }];
    } else if (valueArg.type === 'wildcard') {
      return [...accumulator, {
        query_string: {
          fields: [field.name],
          query: wildcard.toQueryStringQuery(valueArg)
        }
      }];
    }
    /*
      If we detect that it's a date field and the user wants an exact date, we need to convert the query to both >= and <= the value provided to force a range query. This is because match and match_phrase queries do not accept a timezone parameter.
      dateFormatTZ can have the value of 'Browser', in which case we guess the timezone using moment.tz.guess.
    */
    else if (field.type === 'date') {
        const timeZoneParam = config.dateFormatTZ ? {
          time_zone: (0, _get_time_zone_from_settings.getTimeZoneFromSettings)(config.dateFormatTZ)
        } : {};
        return [...accumulator, {
          range: {
            [field.name]: _objectSpread({
              gte: value,
              lte: value
            }, timeZoneParam)
          }
        }];
      } else {
        const queryType = type === 'phrase' ? 'match_phrase' : 'match';
        return [...accumulator, {
          [queryType]: {
            [field.name]: value
          }
        }];
      }
  }, []);
  return {
    bool: {
      should: queries,
      minimum_should_match: 1
    }
  };
}