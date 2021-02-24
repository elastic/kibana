/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ace from 'brace';
import { ScriptHighlightRules } from '@kbn/ace';

const oop = ace.acequire('ace/lib/oop');
const TextMode = ace.acequire('ace/mode/text').Mode;
const MatchingBraceOutdent = ace.acequire('ace/mode/matching_brace_outdent').MatchingBraceOutdent;
const CstyleBehaviour = ace.acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;
const CStyleFoldMode = ace.acequire('ace/mode/folding/cstyle').FoldMode;
ace.acequire('ace/tokenizer');

export function ScriptMode() {
  this.$outdent = new MatchingBraceOutdent();
  this.$behaviour = new CstyleBehaviour();
  this.foldingRules = new CStyleFoldMode();
}

oop.inherits(ScriptMode, TextMode);

(function () {
  this.HighlightRules = ScriptHighlightRules;

  this.getNextLineIndent = function (state, line, tab) {
    let indent = this.$getIndent(line);
    const match = line.match(/^.*[\{\[]\s*$/);
    if (match) {
      indent += tab;
    }

    return indent;
  };

  this.checkOutdent = function (state, line, input) {
    return this.$outdent.checkOutdent(line, input);
  };

  this.autoOutdent = function (state, doc, row) {
    this.$outdent.autoOutdent(doc, row);
  };
}.call(ScriptMode.prototype));
