/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ace from 'brace';
import { workerModule } from './worker';
import { ScriptMode } from './script';

const TextMode = ace.acequire('ace/mode/text').Mode;

const MatchingBraceOutdent = ace.acequire('ace/mode/matching_brace_outdent').MatchingBraceOutdent;
const CstyleBehaviour = ace.acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;
const CStyleFoldMode = ace.acequire('ace/mode/folding/cstyle').FoldMode;
const WorkerClient = ace.acequire('ace/worker/worker_client').WorkerClient;
const AceTokenizer = ace.acequire('ace/tokenizer').Tokenizer;

import { InputHighlightRules } from './input_highlight_rules';

export class Mode extends TextMode {
  constructor() {
    super();
    this.$tokenizer = new AceTokenizer(new InputHighlightRules().getRules());
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CstyleBehaviour();
    this.foldingRules = new CStyleFoldMode();
    this.createModeDelegates({
      'script-': ScriptMode,
    });
  }
}

(function (this: Mode) {
  this.getCompletions = function () {
    // autocomplete is done by the autocomplete module.
    return [];
  };

  this.getNextLineIndent = function (state: string, line: string, tab: string) {
    let indent = this.$getIndent(line);

    if (state !== 'string_literal') {
      const match = line.match(/^.*[\{\(\[]\s*$/);
      if (match) {
        indent += tab;
      }
    }

    return indent;
  };

  this.checkOutdent = function (state: unknown, line: string, input: string) {
    return this.$outdent.checkOutdent(line, input);
  };

  this.autoOutdent = function (state: unknown, doc: string, row: string) {
    this.$outdent.autoOutdent(doc, row);
  };
  this.createWorker = function (session: {
    getDocument: () => string;
    setAnnotations: (arg0: unknown) => void;
  }) {
    const worker = new WorkerClient(['ace', 'sense_editor'], workerModule, 'SenseWorker');
    worker.attachToDocument(session.getDocument());
    worker.on('error', function (e: { data: unknown }) {
      session.setAnnotations([e.data]);
    });

    worker.on('ok', function (anno: { data: unknown }) {
      session.setAnnotations(anno.data);
    });

    return worker;
  };
}).call(Mode.prototype);
