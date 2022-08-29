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
        { include: 'comments' },
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
      addEOL(['whitespace', 'variable.template'], /(\s+)(\${\w+})/, 'start', 'url'),
      addEOL(['whitespace', 'url.protocol_host'], /(\s+)(https?:\/\/[^?\/,]+)/, 'start', 'url'),
      addEOL(['whitespace', 'url.slash'], /(\s+)(\/)/, 'start', 'url'),
      addEOL(['whitespace'], /(\s+)/, 'start', 'url')
    ),
    url: mergeTokens(
      addEOL(['variable.template'], /(\${\w+})/, 'start'),
      addEOL(['url.part'], /(_sql)/, 'start-sql', 'url-sql'),
      addEOL(['url.part'], /([^?\/,\s]+)/, 'start'),
      addEOL(['url.comma'], /(,)/, 'start'),
      addEOL(['url.slash'], /(\/)/, 'start'),
      addEOL(['url.questionmark'], /(\?)/, 'start', 'urlParams'),
      addEOL(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/, 'start')
    ),
    urlParams: mergeTokens(
      addEOL(['url.param', 'url.equal', 'variable.template'], /([^&=]+)(=)(\${\w+})/, 'start'),
      addEOL(['url.param', 'url.equal', 'url.value'], /([^&=]+)(=)([^&]*)/, 'start'),
      addEOL(['url.param'], /([^&=]+)/, 'start'),
      addEOL(['url.amp'], /(&)/, 'start'),
      addEOL(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/, 'start')
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
    /**
     * Each key in this.$rules considered to be a state in state machine. Regular expressions define the tokens for the current state, as well as the transitions into another state.
     * See for more details https://cloud9-sdk.readme.io/docs/highlighting-rules#section-defining-states
     * *
     * Define a state for comments, these comment rules then can be included in other states. E.g. in 'start' and 'json' states by including { include: 'comments' }
     * This will avoid duplicating the same rules in other states
     */
    comments: [
      {
        // Capture a line comment, indicated by #
        token: ['comment.punctuation', 'comment.line'],
        regex: /(#)(.*$)/,
      },
      {
        // Begin capturing a block comment, indicated by /*
        token: 'comment.punctuation',
        regex: /\/\*/,
        push: [
          {
            // Finish capturing a block comment, indicated by */
            token: 'comment.punctuation',
            regex: /\*\//,
            next: 'pop',
          },
          {
            defaultToken: 'comment.block',
          },
        ],
      },
      {
        // Capture a line comment, indicated by //
        token: ['comment.punctuation', 'comment.line'],
        regex: /(\/\/)(.*$)/,
      },
    ],
  };

  addXJsonToRules(this);
  // Add comment rules to json rule set
  this.$rules.json.unshift({ include: 'comments' });

  this.$rules.json.unshift({ token: 'variable.template', regex: /("\${\w+}")/ });

  if (this.constructor === InputHighlightRules) {
    this.normalizeRules();
  }
}

oop.inherits(InputHighlightRules, TextHighlightRules);
