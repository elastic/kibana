/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ace from 'brace';
import { ScriptHighlightRules } from '@kbn/ace';

const TextMode = ace.acequire('ace/mode/text').Mode;
const MatchingBraceOutdent = ace.acequire('ace/mode/matching_brace_outdent').MatchingBraceOutdent;
const CstyleBehaviour = ace.acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;
const CStyleFoldMode = ace.acequire('ace/mode/folding/cstyle').FoldMode;
ace.acequire('ace/tokenizer');

export class ScriptMode extends TextMode {
  constructor() {
    super();
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CstyleBehaviour();
    this.foldingRules = new CStyleFoldMode();
  }
}

(function (this: ScriptMode) {
  this.HighlightRules = ScriptHighlightRules;

  this.getNextLineIndent = function (state: unknown, line: string, tab: string) {
    let indent = this.$getIndent(line);
    const match = line.match(/^.*[\{\[]\s*$/);
    if (match) {
      indent += tab;
    }

    return indent;
  };

  this.checkOutdent = function (state: unknown, line: string, input: string) {
    return this.$outdent.checkOutdent(line, input);
  };

  this.autoOutdent = function (state: unknown, doc: string, row: string) {
    this.$outdent.autoOutdent(doc, row);
  };
}).call(ScriptMode.prototype);
