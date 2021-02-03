/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import ace from 'brace';

import { OutputJsonHighlightRules } from './output_highlight_rules';

const oop = ace.acequire('ace/lib/oop');
const JSONMode = ace.acequire('ace/mode/json').Mode;
const MatchingBraceOutdent = ace.acequire('ace/mode/matching_brace_outdent').MatchingBraceOutdent;
const CstyleBehaviour = ace.acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;
const CStyleFoldMode = ace.acequire('ace/mode/folding/cstyle').FoldMode;
ace.acequire('ace/worker/worker_client');
const AceTokenizer = ace.acequire('ace/tokenizer').Tokenizer;

export function Mode() {
  this.$tokenizer = new AceTokenizer(new OutputJsonHighlightRules().getRules());
  this.$outdent = new MatchingBraceOutdent();
  this.$behaviour = new CstyleBehaviour();
  this.foldingRules = new CStyleFoldMode();
}
oop.inherits(Mode, JSONMode);

(function () {
  this.createWorker = function () {
    return null;
  };

  this.$id = 'sense/mode/input';
}.call(Mode.prototype));
