let acequire = require('acequire');
require('ace');
require('ace/mode-json');

var oop = acequire("ace/lib/oop");
var TextMode = acequire("ace/mode/text").Mode;
var MatchingBraceOutdent = acequire("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
var CstyleBehaviour = acequire("ace/mode/behaviour/cstyle").CstyleBehaviour;
var CStyleFoldMode = acequire("ace/mode/folding/cstyle").FoldMode;
acequire("ace/tokenizer")

var ScriptHighlightRules = require("./script_highlight_rules").ScriptHighlightRules;


export var ScriptMode = function () {
  this.$outdent = new MatchingBraceOutdent();
  this.$behaviour = new CstyleBehaviour();
  this.foldingRules = new CStyleFoldMode();
};
oop.inherits(ScriptMode, TextMode);

(function () {

  this.HighlightRules = ScriptHighlightRules;

  this.getNextLineIndent = function (state, line, tab) {
    var indent = this.$getIndent(line);
    var match = line.match(/^.*[\{\[]\s*$/);
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
  //   var worker = new WorkerClient(["ace", "sense_editor"], "sense_editor/mode/worker", "SenseWorker");
  //   worker.attachToDocument(session.getDocument());


  //   worker.on("error", function (e) {
  //     session.setAnnotations([e.data]);
  //   });

  //   worker.on("ok", function (anno) {
  //     session.setAnnotations(anno.data);
  //   });

  //   return worker;
  // };


}).call(ScriptMode.prototype);
