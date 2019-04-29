/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ace from 'brace';

const oop = ace.acequire('ace/lib/oop');
const TextMode = ace.acequire('ace/mode/text').Mode;
const MatchingBraceOutdent = ace.acequire('ace/mode/matching_brace_outdent').MatchingBraceOutdent;
const CstyleBehaviour = ace.acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;
const CStyleFoldMode = ace.acequire('ace/mode/folding/cstyle').FoldMode;
//const WorkerClient = ace.acequire('ace/worker/worker_client').WorkerClient;
ace.acequire('ace/tokenizer');

const ScriptHighlightRules = require('./script_highlight_rules').ScriptHighlightRules;

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

  // this.createWorker = function (session) {
  //   const worker = new WorkerClient(['ace', 'sense_editor'], 'sense_editor/mode/worker', 'SenseWorker', 'sense_editor/mode/worker');
  //   worker.attachToDocument(session.getDocument());


  //   worker.on('error', function (e) {
  //     session.setAnnotations([e.data]);
  //   });

  //   worker.on('ok', function (anno) {
  //     session.setAnnotations(anno.data);
  //   });

  //   return worker;
  // };


}).call(ScriptMode.prototype);
