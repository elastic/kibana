/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(['require', 'exports', 'module', 'ace', 'ace/mode-json', './output_highlight_rules'], function (require, exports,
                                                                                                       module, ace) {
  'use strict';


  var oop = ace.require("ace/lib/oop");
  var JSONMode = ace.require("ace/mode/json").Mode;
  var HighlightRules = require("./output_highlight_rules").OutputJsonHighlightRules;
  var MatchingBraceOutdent = ace.require("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
  var CstyleBehaviour = ace.require("ace/mode/behaviour/cstyle").CstyleBehaviour;
  var CStyleFoldMode = ace.require("ace/mode/folding/cstyle").FoldMode;
  var WorkerClient = ace.require("ace/worker/worker_client").WorkerClient;
  var AceTokenizer = ace.require("ace/tokenizer").Tokenizer;

  var Mode = function () {
    this.$tokenizer = new AceTokenizer(new HighlightRules().getRules());
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CstyleBehaviour();
    this.foldingRules = new CStyleFoldMode();
  };
  oop.inherits(Mode, JSONMode);

  (function () {
    this.createWorker = function (session) {
      return null;
    };

    this.$id = "sense/mode/input";
  }).call(Mode.prototype);

  exports.Mode = Mode;
});
