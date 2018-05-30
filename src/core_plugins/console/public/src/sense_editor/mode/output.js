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

const ace = require('brace');
require('./output_highlight_rules');


const oop = ace.acequire('ace/lib/oop');
const JSONMode = ace.acequire('ace/mode/json').Mode;
const HighlightRules = require('./output_highlight_rules').OutputJsonHighlightRules;
const MatchingBraceOutdent = ace.acequire('ace/mode/matching_brace_outdent').MatchingBraceOutdent;
const CstyleBehaviour = ace.acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;
const CStyleFoldMode = ace.acequire('ace/mode/folding/cstyle').FoldMode;
ace.acequire('ace/worker/worker_client');
const AceTokenizer = ace.acequire('ace/tokenizer').Tokenizer;

export function Mode() {
  this.$tokenizer = new AceTokenizer(new HighlightRules().getRules());
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
}).call(Mode.prototype);
