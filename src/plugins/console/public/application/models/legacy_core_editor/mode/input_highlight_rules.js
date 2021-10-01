/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ace from 'brace';
import { addXJsonToRules } from '@kbn/ace';

export function addEOL(tokens, reg, nextIfEOL, normalNext) {
  if (typeof reg === 'object') {
    reg = reg.source;
  }
  return [
    { token: tokens.concat(['whitespace']), regex: reg + '(\\s*)$', next: nextIfEOL },
    { token: tokens, regex: reg, next: normalNext },
  ];
}

export function mergeTokens(/* ... */) {
  return [].concat.apply([], arguments);
}

const oop = ace.acequire('ace/lib/oop');
const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');

export function InputHighlightRules() {
  // regexp must not have capturing parentheses. Use (?:) instead.
  // regexps are ordered -> the first match is used
  /*jshint -W015 */
  this.$rules = {
    'start-sql': [
      { token: 'whitespace', regex: '\\s+' },
      { token: 'paren.lparen', regex: '{', next: 'json-sql', push: true },
      { regex: '', next: 'start' },
    ],
    start: mergeTokens(
      [
        { token: 'warning', regex: '#!.*$' },
        { token: 'comment', regex: /^#.*$/ },
        { token: 'paren.lparen', regex: '{', next: 'json', push: true },
      ],
      addEOL(['method'], /([a-zA-Z]+)/, 'start', 'method_sep'),
      [
        {
          token: 'whitespace',
          regex: '\\s+',
        },
        {
          token: 'text',
          regex: '.+?',
        },
      ]
    ),
    method_sep: mergeTokens(
      addEOL(
        ['whitespace', 'url.protocol_host', 'url.slash'],
        /(\s+)(https?:\/\/[^?\/,]+)(\/)/,
        'start',
        'url'
      ),
      addEOL(['whitespace', 'url.protocol_host'], /(\s+)(https?:\/\/[^?\/,]+)/, 'start', 'url'),
      addEOL(['whitespace', 'url.slash'], /(\s+)(\/)/, 'start', 'url'),
      addEOL(['whitespace'], /(\s+)/, 'start', 'url')
    ),
    url: mergeTokens(
      addEOL(['url.part'], /(_sql)/, 'start-sql', 'url-sql'),
      addEOL(['url.part'], /([^?\/,\s]+)/, 'start'),
      addEOL(['url.comma'], /(,)/, 'start'),
      addEOL(['url.slash'], /(\/)/, 'start'),
      addEOL(['url.questionmark'], /(\?)/, 'start', 'urlParams')
    ),
    urlParams: mergeTokens(
      addEOL(['url.param', 'url.equal', 'url.value'], /([^&=]+)(=)([^&]*)/, 'start'),
      addEOL(['url.param'], /([^&=]+)/, 'start'),
      addEOL(['url.amp'], /(&)/, 'start')
    ),
    'url-sql': mergeTokens(
      addEOL(['url.part'], /([^?\/,\s]+)/, 'start-sql'),
      addEOL(['url.comma'], /(,)/, 'start-sql'),
      addEOL(['url.slash'], /(\/)/, 'start-sql'),
      addEOL(['url.questionmark'], /(\?)/, 'start-sql', 'urlParams-sql')
    ),
    'urlParams-sql': mergeTokens(
      addEOL(['url.param', 'url.equal', 'url.value'], /([^&=]+)(=)([^&]*)/, 'start-sql'),
      addEOL(['url.param'], /([^&=]+)/, 'start-sql'),
      addEOL(['url.amp'], /(&)/, 'start-sql')
    ),
  };

  addXJsonToRules(this);

  if (this.constructor === InputHighlightRules) {
    this.normalizeRules();
  }
}

oop.inherits(InputHighlightRules, TextHighlightRules);
