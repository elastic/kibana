"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildQueryFromKuery = buildQueryFromKuery;

var _kuery = require("../kuery");

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function buildQueryFromKuery(indexPattern, queries = [], allowLeadingWildcards, dateFormatTZ = null) {
  const queryASTs = queries.map(query => {
    return (0, _kuery.fromKueryExpression)(query.query, {
      allowLeadingWildcards
    });
  });
  return buildQuery(indexPattern, queryASTs, {
    dateFormatTZ
  });
}

function buildQuery(indexPattern, queryASTs, config = null) {
  const compoundQueryAST = _kuery.nodeTypes.function.buildNode('and', queryASTs);

  const kueryQuery = (0, _kuery.toElasticsearchQuery)(compoundQueryAST, indexPattern, config);
  return _objectSpread({
    must: [],
    filter: [],
    should: [],
    must_not: []
  }, kueryQuery.bool);
}