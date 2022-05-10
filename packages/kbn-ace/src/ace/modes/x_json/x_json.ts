/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ace from 'brace';
import { XJsonHighlightRules } from '..';
import { workerModule } from './worker';

const { WorkerClient } = ace.acequire('ace/worker/worker_client');

const oop = ace.acequire('ace/lib/oop');

const { Mode: JSONMode } = ace.acequire('ace/mode/json');
const { Tokenizer: AceTokenizer } = ace.acequire('ace/tokenizer');
const { MatchingBraceOutdent } = ace.acequire('ace/mode/matching_brace_outdent');
const { CstyleBehaviour } = ace.acequire('ace/mode/behaviour/cstyle');
const { FoldMode: CStyleFoldMode } = ace.acequire('ace/mode/folding/cstyle');

const XJsonMode: any = function XJsonMode(this: any) {
  const ruleset: any = new (XJsonHighlightRules as any)();
  ruleset.normalizeRules();
  this.$tokenizer = new AceTokenizer(ruleset.getRules());
  this.$outdent = new MatchingBraceOutdent();
  this.$behaviour = new CstyleBehaviour();
  this.foldingRules = new CStyleFoldMode();
};

oop.inherits(XJsonMode, JSONMode);

// Then clobber `createWorker` method to install our worker source. Per ace's wiki: https://github.com/ajaxorg/ace/wiki/Syntax-validation
(XJsonMode.prototype as any).createWorker = function (session: ace.IEditSession) {
  const xJsonWorker = new WorkerClient(['ace'], workerModule, 'JsonWorker');

  xJsonWorker.attachToDocument(session.getDocument());

  xJsonWorker.on('annotate', function (e: { data: any }) {
    session.setAnnotations(e.data);
  });

  xJsonWorker.on('terminate', function () {
    session.clearAnnotations();
  });

  return xJsonWorker;
};

export { XJsonMode };

export function installXJsonMode(editor: ace.Editor) {
  const session = editor.getSession();
  session.setMode(new XJsonMode());
}
