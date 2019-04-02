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

import * as ast from '../ast';
import expect from '@kbn/expect';
import { nodeTypes } from '../../node_types/index';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';

// Helpful utility allowing us to test the PEG parser by simply checking for deep equality between
// the nodes the parser generates and the nodes our constructor functions generate.
function fromLegacyKueryExpressionNoMeta(text) {
  return ast.fromLegacyKueryExpression(text, { includeMetadata: false });
}

let indexPattern;

describe('kuery AST API', function () {


  beforeEach(() => {
    indexPattern = indexPatternResponse;
  });

  describe('fromLegacyKueryExpression', function () {

    it('should return location and text metadata for each AST node', function () {
      const notNode = ast.fromLegacyKueryExpression('!foo:bar');
      expect(notNode).to.have.property('text', '!foo:bar');
      expect(notNode.location).to.eql({ min: 0, max: 8 });

      const isNode = notNode.arguments[0];
      expect(isNode).to.have.property('text', 'foo:bar');
      expect(isNode.location).to.eql({ min: 1, max: 8 });

      const { arguments: [ argNode1, argNode2 ] } = isNode;
      expect(argNode1).to.have.property('text', 'foo');
      expect(argNode1.location).to.eql({ min: 1, max: 4 });

      expect(argNode2).to.have.property('text', 'bar');
      expect(argNode2.location).to.eql({ min: 5, max: 8 });
    });

    it('should return a match all "is" function for whitespace', function () {
      const expected = nodeTypes.function.buildNode('is', '*', '*');
      const actual = fromLegacyKueryExpressionNoMeta('  ');
      expect(actual).to.eql(expected);
    });

    it('should return an "and" function for single literals', function () {
      const expected = nodeTypes.function.buildNode('and', [nodeTypes.literal.buildNode('foo')]);
      const actual = fromLegacyKueryExpressionNoMeta('foo');
      expect(actual).to.eql(expected);
    });

    it('should ignore extraneous whitespace at the beginning and end of the query', function () {
      const expected = nodeTypes.function.buildNode('and', [nodeTypes.literal.buildNode('foo')]);
      const actual = fromLegacyKueryExpressionNoMeta('  foo ');
      expect(actual).to.eql(expected);
    });

    it('literals and queries separated by whitespace should be joined by an implicit "and"', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ]);
      const actual = fromLegacyKueryExpressionNoMeta('foo bar');
      expect(actual).to.eql(expected);
    });

    it('should also support explicit "and"s as a binary operator', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ]);
      const actual = fromLegacyKueryExpressionNoMeta('foo and bar');
      expect(actual).to.eql(expected);
    });

    it('should also support "and" as a function', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ], 'function');
      const actual = fromLegacyKueryExpressionNoMeta('and(foo, bar)');
      expect(actual).to.eql(expected);
    });

    it('should support "or" as a binary operator', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ]);
      const actual = fromLegacyKueryExpressionNoMeta('foo or bar');
      expect(actual).to.eql(expected);
    });

    it('should support "or" as a function', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.literal.buildNode('bar'),
      ]);
      const actual = fromLegacyKueryExpressionNoMeta('or(foo, bar)');
      expect(actual).to.eql(expected);
    });

    it('should support negation of queries with a "!" prefix', function () {
      const expected = nodeTypes.function.buildNode('not',
        nodeTypes.function.buildNode('or', [
          nodeTypes.literal.buildNode('foo'),
          nodeTypes.literal.buildNode('bar'),
        ]));
      const actual = fromLegacyKueryExpressionNoMeta('!or(foo, bar)');
      expect(actual).to.eql(expected);
    });

    it('"and" should have a higher precedence than "or"', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.literal.buildNode('foo'),
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('and', [
            nodeTypes.literal.buildNode('bar'),
            nodeTypes.literal.buildNode('baz'),
          ]),
          nodeTypes.literal.buildNode('qux'),
        ])
      ]);
      const actual = fromLegacyKueryExpressionNoMeta('foo or bar and baz or qux');
      expect(actual).to.eql(expected);
    });

    it('should support grouping to override default precedence', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('or', [
          nodeTypes.literal.buildNode('foo'),
          nodeTypes.literal.buildNode('bar'),
        ]),
        nodeTypes.literal.buildNode('baz'),
      ]);
      const actual = fromLegacyKueryExpressionNoMeta('(foo or bar) and baz');
      expect(actual).to.eql(expected);
    });

    it('should support a shorthand operator syntax for "is" functions', function () {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'bar', true);
      const actual = fromLegacyKueryExpressionNoMeta('foo:bar');
      expect(actual).to.eql(expected);
    });

    it('should support a shorthand operator syntax for inclusive "range" functions', function () {
      const argumentNodes = [
        nodeTypes.literal.buildNode('bytes'),
        nodeTypes.literal.buildNode(1000),
        nodeTypes.literal.buildNode(8000),
      ];
      const expected = nodeTypes.function.buildNodeWithArgumentNodes('range', argumentNodes);
      const actual = fromLegacyKueryExpressionNoMeta('bytes:[1000 to 8000]');
      expect(actual).to.eql(expected);
    });

    it('should support functions with named arguments', function () {
      const expected = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 });
      const actual = fromLegacyKueryExpressionNoMeta('range(bytes, gt=1000, lt=8000)');
      expect(actual).to.eql(expected);
    });

    it('should throw an error for unknown functions', function () {
      expect(ast.fromLegacyKueryExpression).withArgs('foo(bar)').to.throwException(/Unknown function "foo"/);
    });
  });

  describe('fromKueryExpression', function () {

    it('should return a match all "is" function for whitespace', function () {
      const expected = nodeTypes.function.buildNode('is', '*', '*');
      const actual = ast.fromKueryExpression('  ');
      expect(actual).to.eql(expected);
    });

    it('should return an "is" function with a null field for single literals', function () {
      const expected = nodeTypes.function.buildNode('is', null, 'foo');
      const actual = ast.fromKueryExpression('foo');
      expect(actual).to.eql(expected);
    });

    it('should ignore extraneous whitespace at the beginning and end of the query', function () {
      const expected = nodeTypes.function.buildNode('is', null, 'foo');
      const actual = ast.fromKueryExpression('  foo ');
      expect(actual).to.eql(expected);
    });

    it('should not split on whitespace', function () {
      const expected = nodeTypes.function.buildNode('is', null, 'foo bar');
      const actual = ast.fromKueryExpression('foo bar');
      expect(actual).to.eql(expected);
    });

    it('should support "and" as a binary operator', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
      ]);
      const actual = ast.fromKueryExpression('foo and bar');
      expect(actual).to.eql(expected);
    });

    it('should support "or" as a binary operator', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('is', null, 'bar'),
      ]);
      const actual = ast.fromKueryExpression('foo or bar');
      expect(actual).to.eql(expected);
    });

    it('should support negation of queries with a "not" prefix', function () {
      const expected = nodeTypes.function.buildNode('not',
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('is', null, 'foo'),
          nodeTypes.function.buildNode('is', null, 'bar'),
        ])
      );
      const actual = ast.fromKueryExpression('not (foo or bar)');
      expect(actual).to.eql(expected);
    });

    it('"and" should have a higher precedence than "or"', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.function.buildNode('is', null, 'foo'),
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('and', [
            nodeTypes.function.buildNode('is', null, 'bar'),
            nodeTypes.function.buildNode('is', null, 'baz'),
          ]),
          nodeTypes.function.buildNode('is', null, 'qux'),
        ])
      ]);
      const actual = ast.fromKueryExpression('foo or bar and baz or qux');
      expect(actual).to.eql(expected);
    });

    it('should support grouping to override default precedence', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('is', null, 'foo'),
          nodeTypes.function.buildNode('is', null, 'bar'),
        ]),
        nodeTypes.function.buildNode('is', null, 'baz'),
      ]);
      const actual = ast.fromKueryExpression('(foo or bar) and baz');
      expect(actual).to.eql(expected);
    });

    it('should support matching against specific fields', function () {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'bar');
      const actual = ast.fromKueryExpression('foo:bar');
      expect(actual).to.eql(expected);
    });

    it('should also not split on whitespace when matching specific fields', function () {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'bar baz');
      const actual = ast.fromKueryExpression('foo:bar baz');
      expect(actual).to.eql(expected);
    });

    it('should treat quoted values as phrases', function () {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'bar baz', true);
      const actual = ast.fromKueryExpression('foo:"bar baz"');
      expect(actual).to.eql(expected);
    });

    it('should support a shorthand for matching multiple values against a single field', function () {
      const expected = nodeTypes.function.buildNode('or', [
        nodeTypes.function.buildNode('is', 'foo', 'bar'),
        nodeTypes.function.buildNode('is', 'foo', 'baz'),
      ]);
      const actual = ast.fromKueryExpression('foo:(bar or baz)');
      expect(actual).to.eql(expected);
    });

    it('should support "and" and "not" operators and grouping in the shorthand as well', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('or', [
          nodeTypes.function.buildNode('is', 'foo', 'bar'),
          nodeTypes.function.buildNode('is', 'foo', 'baz'),
        ]),
        nodeTypes.function.buildNode('not',
          nodeTypes.function.buildNode('is', 'foo', 'qux')
        ),
      ]);
      const actual = ast.fromKueryExpression('foo:((bar or baz) and not qux)');
      expect(actual).to.eql(expected);
    });

    it('should support exclusive range operators', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('range', 'bytes', {
          gt: 1000,
        }),
        nodeTypes.function.buildNode('range', 'bytes', {
          lt: 8000,
        }),
      ]);
      const actual = ast.fromKueryExpression('bytes > 1000 and bytes < 8000');
      expect(actual).to.eql(expected);
    });

    it('should support inclusive range operators', function () {
      const expected = nodeTypes.function.buildNode('and', [
        nodeTypes.function.buildNode('range', 'bytes', {
          gte: 1000,
        }),
        nodeTypes.function.buildNode('range', 'bytes', {
          lte: 8000,
        }),
      ]);
      const actual = ast.fromKueryExpression('bytes >= 1000 and bytes <= 8000');
      expect(actual).to.eql(expected);
    });

    it('should support wildcards in field names', function () {
      const expected = nodeTypes.function.buildNode('is', 'machine*', 'osx');
      const actual = ast.fromKueryExpression('machine*:osx');
      expect(actual).to.eql(expected);
    });

    it('should support wildcards in values', function () {
      const expected = nodeTypes.function.buildNode('is', 'foo', 'ba*');
      const actual = ast.fromKueryExpression('foo:ba*');
      expect(actual).to.eql(expected);
    });

    it('should create an exists "is" query when a field is given and "*" is the value', function () {
      const expected = nodeTypes.function.buildNode('is', 'foo', '*');
      const actual = ast.fromKueryExpression('foo:*');
      expect(actual).to.eql(expected);
    });

  });

  describe('fromLiteralExpression', function () {

    it('should create literal nodes for unquoted values with correct primitive types', function () {
      const stringLiteral = nodeTypes.literal.buildNode('foo');
      const booleanFalseLiteral = nodeTypes.literal.buildNode(false);
      const booleanTrueLiteral = nodeTypes.literal.buildNode(true);
      const numberLiteral = nodeTypes.literal.buildNode(42);

      expect(ast.fromLiteralExpression('foo')).to.eql(stringLiteral);
      expect(ast.fromLiteralExpression('true')).to.eql(booleanTrueLiteral);
      expect(ast.fromLiteralExpression('false')).to.eql(booleanFalseLiteral);
      expect(ast.fromLiteralExpression('42')).to.eql(numberLiteral);
    });

    it('should allow escaping of special characters with a backslash', function () {
      const expected = nodeTypes.literal.buildNode('\\():<>"*');
      // yo dawg
      const actual = ast.fromLiteralExpression('\\\\\\(\\)\\:\\<\\>\\"\\*');
      expect(actual).to.eql(expected);
    });

    it('should support double quoted strings that do not need escapes except for quotes', function () {
      const expected = nodeTypes.literal.buildNode('\\():<>"*');
      const actual = ast.fromLiteralExpression('"\\():<>\\"*"');
      expect(actual).to.eql(expected);
    });

    it('should support escaped backslashes inside quoted strings', function () {
      const expected = nodeTypes.literal.buildNode('\\');
      const actual = ast.fromLiteralExpression('"\\\\"');
      expect(actual).to.eql(expected);
    });

    it('should detect wildcards and build wildcard AST nodes', function () {
      const expected = nodeTypes.wildcard.buildNode('foo*bar');
      const actual = ast.fromLiteralExpression('foo*bar');
      expect(actual).to.eql(expected);
    });
  });

  describe('toElasticsearchQuery', function () {

    it('should return the given node type\'s ES query representation', function () {
      const node = nodeTypes.function.buildNode('exists', 'response');
      const expected = nodeTypes.function.toElasticsearchQuery(node, indexPattern);
      const result = ast.toElasticsearchQuery(node, indexPattern);
      expect(result).to.eql(expected);
    });

    it('should return an empty "and" function for undefined nodes and unknown node types', function () {
      const expected = nodeTypes.function.toElasticsearchQuery(nodeTypes.function.buildNode('and', []));

      expect(ast.toElasticsearchQuery()).to.eql(expected);

      const noTypeNode = nodeTypes.function.buildNode('exists', 'foo');
      delete noTypeNode.type;
      expect(ast.toElasticsearchQuery(noTypeNode)).to.eql(expected);

      const unknownTypeNode = nodeTypes.function.buildNode('exists', 'foo');
      unknownTypeNode.type = 'notValid';
      expect(ast.toElasticsearchQuery(unknownTypeNode)).to.eql(expected);
    });

  });

  describe('doesKueryExpressionHaveLuceneSyntaxError', function () {
    it('should return true for Lucene ranges', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar: [1 TO 10]');
      expect(result).to.eql(true);
    });

    it('should return false for KQL ranges', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar < 1');
      expect(result).to.eql(false);
    });

    it('should return true for Lucene exists', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('_exists_: bar');
      expect(result).to.eql(true);
    });

    it('should return false for KQL exists', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar:*');
      expect(result).to.eql(false);
    });

    it('should return true for Lucene wildcards', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar: ba?');
      expect(result).to.eql(true);
    });

    it('should return false for KQL wildcards', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar: ba*');
      expect(result).to.eql(false);
    });

    it('should return true for Lucene regex', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar: /ba.*/');
      expect(result).to.eql(true);
    });

    it('should return true for Lucene fuzziness', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar: ba~');
      expect(result).to.eql(true);
    });

    it('should return true for Lucene proximity', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar: "ba"~2');
      expect(result).to.eql(true);
    });

    it('should return true for Lucene boosting', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('bar: ba^2');
      expect(result).to.eql(true);
    });

    it('should return true for Lucene + operator', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('+foo: bar');
      expect(result).to.eql(true);
    });

    it('should return true for Lucene - operators', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('-foo: bar');
      expect(result).to.eql(true);
    });

    it('should return true for Lucene && operators', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('foo: bar && baz: qux');
      expect(result).to.eql(true);
    });

    it('should return true for Lucene || operators', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('foo: bar || baz: qux');
      expect(result).to.eql(true);
    });

    it('should return true for mixed KQL/Lucene queries', function () {
      const result = ast.doesKueryExpressionHaveLuceneSyntaxError('foo: bar and (baz: qux || bag)');
      expect(result).to.eql(true);
    });
  });

});
