let ace = require('ace');
let acequire = require('acequire');
let mode_json = require('ace/mode-json');
let output_highlighting_rules = require('./output_highlight_rules');


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

module.exports.Mode = Mode;
