/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ace from 'brace';
import 'brace/mode/json';
import { addXJsonToRules } from '@kbn/ace';

const oop = ace.acequire('ace/lib/oop');
const JsonHighlightRules = ace.acequire('ace/mode/json_highlight_rules').JsonHighlightRules;

export function OutputJsonHighlightRules() {
  this.$rules = {};

  addXJsonToRules(this, 'start');

  this.$rules.start.unshift(
    {
      token: 'warning',
      regex: '#!.*$',
    },
    {
      token: 'comment',
      /* Comments start with '#' character and end where characters start with http status and statusText
       * This will allow us to tokenize the status badges for highlighting the multiple request results in editor output
       */
      regex: /#(.*?)(?=\d+\s(?:OK|Bad Request|Not Found|Continue|Created)|$)/,
    },
    {
      token: function (value) {
        const status = value.match(/\d+/);
        if (status <= 199) {
          return 'badge.badge-default';
        }
        if (status <= 299) {
          return 'badge.badge-success';
        }
        if (status <= 399) {
          return 'badge.badge-primary';
        }
        if (status <= 499) {
          return 'badge.badge-warning';
        }
        return 'badge.badge-danger';
      },
      // Matches any digits ending with http statusText at the end of string
      regex: /(\d+\s(OK|Bad Request|Not Found|Continue|Created))$/,
    }
  );

  if (this.constructor === OutputJsonHighlightRules) {
    this.normalizeRules();
  }
}

oop.inherits(OutputJsonHighlightRules, JsonHighlightRules);
