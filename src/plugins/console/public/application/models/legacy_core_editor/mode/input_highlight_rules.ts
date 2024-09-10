/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ace from 'brace';
import { addXJsonToRules } from '@kbn/ace';

type Token =
  | string
  | { token?: string; regex?: string; next?: string; push?: boolean; include?: string };

export function addEOL(
  tokens: Token[],
  reg: string | RegExp,
  nextIfEOL: string,
  normalNext?: string
) {
  if (typeof reg === 'object') {
    reg = reg.source;
  }
  return [
    { token: tokens.concat(['whitespace']), regex: reg + '(\\s*)$', next: nextIfEOL },
    { token: tokens, regex: reg, next: normalNext },
  ];
}

export const mergeTokens = (...args: any[]) => [].concat.apply([], args);

const TextHighlightRules = ace.acequire('ace/mode/text_highlight_rules').TextHighlightRules;
// translating this to monaco
export class InputHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    this.$rules = {
      // TODO
      'start-sql': [
        { token: 'whitespace', regex: '\\s+' },
        { token: 'paren.lparen', regex: '{', next: 'json-sql', push: true },
        { regex: '', next: 'start' },
      ],
      start: mergeTokens(
        [
          // done
          { token: 'warning', regex: '#!.*$' },
          // done
          { include: 'comments' },
          // done
          { token: 'paren.lparen', regex: '{', next: 'json', push: true },
        ],
        // done
        addEOL(['method'], /([a-zA-Z]+)/, 'start', 'method_sep'),
        [
          // done
          {
            token: 'whitespace',
            regex: '\\s+',
          },
          // done
          {
            token: 'text',
            regex: '.+?',
          },
        ]
      ),
      method_sep: mergeTokens(
        // done
        addEOL(
          ['whitespace', 'url.protocol_host', 'url.slash'],
          /(\s+)(https?:\/\/[^?\/,]+)(\/)/,
          'start',
          'url'
        ),
        // done
        addEOL(['whitespace', 'variable.template'], /(\s+)(\${\w+})/, 'start', 'url'),
        // done
        addEOL(['whitespace', 'url.protocol_host'], /(\s+)(https?:\/\/[^?\/,]+)/, 'start', 'url'),
        // done
        addEOL(['whitespace', 'url.slash'], /(\s+)(\/)/, 'start', 'url'),
        // done
        addEOL(['whitespace'], /(\s+)/, 'start', 'url')
      ),
      url: mergeTokens(
        // done
        addEOL(['variable.template'], /(\${\w+})/, 'start'),
        // TODO
        addEOL(['url.part'], /(_sql)/, 'start-sql', 'url-sql'),
        // done
        addEOL(['url.part'], /([^?\/,\s]+)/, 'start'),
        // done
        addEOL(['url.comma'], /(,)/, 'start'),
        // done
        addEOL(['url.slash'], /(\/)/, 'start'),
        // done
        addEOL(['url.questionmark'], /(\?)/, 'start', 'urlParams'),
        // done
        addEOL(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/, 'start')
      ),
      urlParams: mergeTokens(
        // done
        addEOL(['url.param', 'url.equal', 'variable.template'], /([^&=]+)(=)(\${\w+})/, 'start'),
        // done
        addEOL(['url.param', 'url.equal', 'url.value'], /([^&=]+)(=)([^&]*)/, 'start'),
        // done
        addEOL(['url.param'], /([^&=]+)/, 'start'),
        // done
        addEOL(['url.amp'], /(&)/, 'start'),
        // done
        addEOL(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/, 'start')
      ),
      // TODO
      'url-sql': mergeTokens(
        addEOL(['url.part'], /([^?\/,\s]+)/, 'start-sql'),
        addEOL(['url.comma'], /(,)/, 'start-sql'),
        addEOL(['url.slash'], /(\/)/, 'start-sql'),
        addEOL(['url.questionmark'], /(\?)/, 'start-sql', 'urlParams-sql')
      ),
      // TODO
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
          // done
          token: ['comment.punctuation', 'comment.line'],
          regex: /(#)(.*$)/,
        },
        {
          // Begin capturing a block comment, indicated by /*
          // done
          token: 'comment.punctuation',
          regex: /\/\*/,
          push: [
            {
              // Finish capturing a block comment, indicated by */
              // done
              token: 'comment.punctuation',
              regex: /\*\//,
              next: 'pop',
            },
            {
              // done
              defaultToken: 'comment.block',
            },
          ],
        },
        {
          // Capture a line comment, indicated by //
          // done
          token: ['comment.punctuation', 'comment.line'],
          regex: /(\/\/)(.*$)/,
        },
      ],
    };

    addXJsonToRules(this, 'json');
    // Add comment rules to json rule set
    this.$rules.json.unshift({ include: 'comments' });

    this.$rules.json.unshift({ token: 'variable.template', regex: /("\${\w+}")/ });

    if (this instanceof InputHighlightRules) {
      this.normalizeRules();
    }
  }
}
