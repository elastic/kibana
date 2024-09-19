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
      regex: '#.*$',
    }
  );

  if (this.constructor === OutputJsonHighlightRules) {
    this.normalizeRules();
  }
}

oop.inherits(OutputJsonHighlightRules, JsonHighlightRules);
