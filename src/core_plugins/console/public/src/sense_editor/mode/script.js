import ace from 'ace';

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
