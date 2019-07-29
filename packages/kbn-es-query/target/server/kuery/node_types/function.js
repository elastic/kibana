"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildNode = buildNode;
exports.buildNodeWithArgumentNodes = buildNodeWithArgumentNodes;
exports.toElasticsearchQuery = toElasticsearchQuery;

var _lodash = _interopRequireDefault(require("lodash"));

var _functions = require("../functions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function buildNode(functionName, ...functionArgs) {
  const kueryFunction = _functions.functions[functionName];

  if (_lodash.default.isUndefined(kueryFunction)) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return _objectSpread({
    type: 'function',
    function: functionName
  }, kueryFunction.buildNodeParams(...functionArgs));
} // Mainly only useful in the grammar where we'll already have real argument nodes in hand


function buildNodeWithArgumentNodes(functionName, argumentNodes) {
  if (_lodash.default.isUndefined(_functions.functions[functionName])) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return {
    type: 'function',
    function: functionName,
    arguments: argumentNodes
  };
}

function toElasticsearchQuery(node, indexPattern, config = {}) {
  const kueryFunction = _functions.functions[node.function];
  return kueryFunction.toElasticsearchQuery(node, indexPattern, config);
}