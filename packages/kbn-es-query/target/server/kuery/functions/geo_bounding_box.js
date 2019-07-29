"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildNodeParams = buildNodeParams;
exports.toElasticsearchQuery = toElasticsearchQuery;

var _lodash = _interopRequireDefault(require("lodash"));

var _node_types = require("../node_types");

var ast = _interopRequireWildcard(require("../ast"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function buildNodeParams(fieldName, params) {
  params = _lodash.default.pick(params, 'topLeft', 'bottomRight');

  const fieldNameArg = _node_types.nodeTypes.literal.buildNode(fieldName);

  const args = _lodash.default.map(params, (value, key) => {
    const latLon = `${value.lat}, ${value.lon}`;
    return _node_types.nodeTypes.namedArg.buildNode(key, latLon);
  });

  return {
    arguments: [fieldNameArg, ...args]
  };
}

function toElasticsearchQuery(node, indexPattern) {
  const [fieldNameArg, ...args] = node.arguments;

  const fieldName = _node_types.nodeTypes.literal.toElasticsearchQuery(fieldNameArg);

  const field = _lodash.default.get(indexPattern, 'fields', []).find(field => field.name === fieldName);

  const queryParams = args.reduce((acc, arg) => {
    const snakeArgName = _lodash.default.snakeCase(arg.name);

    return _objectSpread({}, acc, {
      [snakeArgName]: ast.toElasticsearchQuery(arg)
    });
  }, {});

  if (field && field.scripted) {
    throw new Error(`Geo bounding box query does not support scripted fields`);
  }

  return {
    geo_bounding_box: {
      [fieldName]: queryParams,
      ignore_unmapped: true
    }
  };
}