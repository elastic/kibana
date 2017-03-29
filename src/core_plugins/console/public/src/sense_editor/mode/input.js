let acequire = require('acequire');
require('ace');
require('ace/mode-json');

var oop = acequire("ace/lib/oop");
var TextMode = acequire("ace/mode/text").Mode;
var ScriptMode = require("./script").ScriptMode;
var MatchingBraceOutdent = acequire("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
var CstyleBehaviour = acequire("ace/mode/behaviour/cstyle").CstyleBehaviour;
var CStyleFoldMode = acequire("ace/mode/folding/cstyle").FoldMode;
var WorkerClient = acequire("ace/worker/worker_client").WorkerClient;
var AceTokenizer = acequire("ace/tokenizer").Tokenizer;

var HighlightRules = require("./input_highlight_rules").InputHighlightRules;

acequire("ace/config").setModuleUrl("sense_editor/mode/worker", require("file!./worker.js"));


var Mode = function () {
  this.$tokenizer = new AceTokenizer(new HighlightRules().getRules());
  this.$outdent = new MatchingBraceOutdent();
  this.$behaviour = new CstyleBehaviour();
  this.foldingRules = new CStyleFoldMode();
  this.createModeDelegates({
    "script-": ScriptMode
  });
};
oop.inherits(Mode, TextMode);

(function () {
  this.getCompletions = function () {
    // autocomplete is done by the autocomplete module.
    return [];
  };

  this.getNextLineIndent = function (state, line, tab) {
    var indent = this.$getIndent(line);

    if (state !== "string_literal") {
      var match = line.match(/^.*[\{\(\[]\s*$/);
      if (match) {
        indent += tab;
      }
    }

    return indent;
  };

  this.checkOutdent = function (state, line, input) {
    return this.$outdent.checkOutdent(line, input);
  };

  this.autoOutdent = function (state, doc, row) {
    this.$outdent.autoOutdent(doc, row);
  };

  this.createWorker = function (session) {
    var worker = new WorkerClient(["ace", "sense_editor"], "sense_editor/mode/worker", "SenseWorker");
    worker.attachToDocument(session.getDocument());


    worker.on("error", function (e) {
      session.setAnnotations([e.data]);
    });

    worker.on("ok", function (anno) {
      session.setAnnotations(anno.data);
    });

    return worker;
  };


}).call(Mode.prototype);

module.exports.Mode = Mode;
