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

import * as _ from 'lodash';
import ace from 'brace';
import 'brace/mode/json';

import { ElasticsearchSqlHighlightRules } from './elasticsearch_sql_highlight_rules';
const { ScriptHighlightRules } = require('./script_highlight_rules');

const { JsonHighlightRules } = ace.acequire('ace/mode/json_highlight_rules');
const oop = ace.acequire('ace/lib/oop');

const jsonRules = function(root) {
  root = root ? root : 'json';
  const rules = {};
  const xJsonRules = [
    {
      token: [
        'variable',
        'whitespace',
        'ace.punctuation.colon',
        'whitespace',
        'punctuation.start_triple_quote',
      ],
      regex: '("(?:[^"]*_)?script"|"inline"|"source")(\\s*?)(:)(\\s*?)(""")',
      next: 'script-start',
      merge: false,
      push: true,
    },
    {
      token: 'variable', // single line
      regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]\\s*(?=:)',
    },
    {
      token: 'punctuation.start_triple_quote',
      regex: '"""',
      next: 'string_literal',
      merge: false,
      push: true,
    },
    {
      token: 'string', // single line
      regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]',
    },
    {
      token: 'constant.numeric', // hex
      regex: '0[xX][0-9a-fA-F]+\\b',
    },
    {
      token: 'constant.numeric', // float
      regex: '[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b',
    },
    {
      token: 'constant.language.boolean',
      regex: '(?:true|false)\\b',
    },
    {
      token: 'invalid.illegal', // single quoted strings are not allowed
      regex: "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']",
    },
    {
      token: 'invalid.illegal', // comments are not allowed
      regex: '\\/\\/.*$',
    },
    {
      token: 'paren.lparen',
      merge: false,
      regex: '{',
      next: root,
      push: true,
    },
    {
      token: 'paren.lparen',
      merge: false,
      regex: '[[(]',
    },
    {
      token: 'paren.rparen',
      merge: false,
      regex: '[\\])]',
    },
    {
      token: 'paren.rparen',
      regex: '}',
      merge: false,
      next: 'pop',
    },
    {
      token: 'punctuation.comma',
      regex: ',',
    },
    {
      token: 'punctuation.colon',
      regex: ':',
    },
    {
      token: 'whitespace',
      regex: '\\s+',
    },
    {
      token: 'text',
      regex: '.+?',
    },
  ];

  rules[root] = xJsonRules;
  rules[root + '-sql'] = [
    {
      token: [
        'variable',
        'whitespace',
        'ace.punctuation.colon',
        'whitespace',
        'punctuation.start_triple_quote',
      ],
      regex: '("query")(\\s*?)(:)(\\s*?)(""")',
      next: 'sql-start',
      merge: false,
      push: true,
    },
  ].concat(xJsonRules);

  rules.string_literal = [
    {
      token: 'punctuation.end_triple_quote',
      regex: '"""',
      next: 'pop',
    },
    {
      token: 'multi_string',
      regex: '.',
    },
  ];
  return rules;
};

export function XJsonHighlightRules() {
  this.$rules = {
    ...jsonRules('start'),
  };

  this.embedRules(ScriptHighlightRules, 'script-', [
    {
      token: 'punctuation.end_triple_quote',
      regex: '"""',
      next: 'pop',
    },
  ]);

  this.embedRules(ElasticsearchSqlHighlightRules, 'sql-', [
    {
      token: 'punctuation.end_triple_quote',
      regex: '"""',
      next: 'pop',
    },
  ]);
}

oop.inherits(XJsonHighlightRules, JsonHighlightRules);

export function addToRules(otherRules, embedUnder) {
  otherRules.$rules = _.defaultsDeep(otherRules.$rules, jsonRules(embedUnder));
  otherRules.embedRules(ScriptHighlightRules, 'script-', [
    {
      token: 'punctuation.end_triple_quote',
      regex: '"""',
      next: 'pop',
    },
  ]);
  otherRules.embedRules(ElasticsearchSqlHighlightRules, 'sql-', [
    {
      token: 'punctuation.end_triple_quote',
      regex: '"""',
      next: 'pop',
    },
  ]);
}
