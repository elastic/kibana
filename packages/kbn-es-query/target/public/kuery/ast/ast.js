function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
import { nodeTypes } from '../node_types/index';
import { parse as parseKuery } from './kuery';
import { KQLSyntaxError } from '../errors';
export function fromLiteralExpression(expression, parseOptions) {
  parseOptions = _objectSpread({}, parseOptions, {
    startRule: 'Literal'
  });
  return fromExpression(expression, parseOptions, parseKuery);
}
export function fromKueryExpression(expression, parseOptions) {
  try {
    return fromExpression(expression, parseOptions, parseKuery);
  } catch (error) {
    if (error.name === 'SyntaxError') {
      throw new KQLSyntaxError(error, expression);
    } else {
      throw error;
    }
  }
}

function fromExpression(expression) {
  var parseOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var parse = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : parseKuery;

  if (_.isUndefined(expression)) {
    throw new Error('expression must be a string, got undefined instead');
  }

  parseOptions = _objectSpread({}, parseOptions, {
    helpers: {
      nodeTypes: nodeTypes
    }
  });
  return parse(expression, parseOptions);
}
/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 */


export function toElasticsearchQuery(node, indexPattern) {
  var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', []));
  }

  return nodeTypes[node.type].toElasticsearchQuery(node, indexPattern, config);
}
export function doesKueryExpressionHaveLuceneSyntaxError(expression) {
  try {
    fromExpression(expression, {
      errorOnLuceneSyntax: true
    }, parseKuery);
    return false;
  } catch (e) {
    return e.message.startsWith('Lucene');
  }
}