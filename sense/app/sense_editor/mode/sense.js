define(['require', 'exports', 'module' , 'ace', 'ace_mode_json','./sense_highlight_rules'], function (require, exports, module, ace) {
  'use strict';


  var oop = ace.require("ace/lib/oop");
  var TextMode = ace.require("ace/mode/text").Mode;
  var HighlightRules = require("./sense_highlight_rules").SenseJsonHighlightRules;
  var MatchingBraceOutdent = ace.require("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
  var CstyleBehaviour = ace.require("ace/mode/behaviour/cstyle").CstyleBehaviour;
  var CStyleFoldMode = ace.require("ace/mode/folding/cstyle").FoldMode;
  var WorkerClient = ace.require("ace/worker/worker_client").WorkerClient;
  var AceTokenizer = ace.require("ace/tokenizer").Tokenizer;

  ace.require("ace/config").setModuleUrl("sense_editor/mode/worker", require.toUrl("./worker.js"));


  var Mode = function () {
    this.$tokenizer = new AceTokenizer(new HighlightRules().getRules());
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CstyleBehaviour();
    this.foldingRules = new CStyleFoldMode();
  };
  oop.inherits(Mode, TextMode);

  (function () {
    this.getCompletions = function(editor, session, pos, prefix) {
      // autocomplete is done by the autocomplete module.
      return [];
    };

    this.getNextLineIndent = function (state, line, tab) {
      var indent = this.$getIndent(line);

      if (state != "double_q_string") {
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

  exports.Mode = Mode;
});
