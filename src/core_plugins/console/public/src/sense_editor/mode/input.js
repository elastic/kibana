import ace from 'ace';

const oop = ace.acequire('ace/lib/oop');
const TextMode = ace.acequire('ace/mode/text').Mode;
const ScriptMode = require('./script').ScriptMode;
const MatchingBraceOutdent = ace.acequire('ace/mode/matching_brace_outdent').MatchingBraceOutdent;
const CstyleBehaviour = ace.acequire('ace/mode/behaviour/cstyle').CstyleBehaviour;
const CStyleFoldMode = ace.acequire('ace/mode/folding/cstyle').FoldMode;
const WorkerClient = ace.acequire('ace/worker/worker_client').WorkerClient;
const AceTokenizer = ace.acequire('ace/tokenizer').Tokenizer;

const HighlightRules = require('./input_highlight_rules').InputHighlightRules;
ace.acequire('ace/config').setModuleUrl('sense_editor/mode/worker', require('file-loader!./worker.js'));
//

export function Mode() {
  this.$tokenizer = new AceTokenizer(new HighlightRules().getRules());
  this.$outdent = new MatchingBraceOutdent();
  this.$behaviour = new CstyleBehaviour();
  this.foldingRules = new CStyleFoldMode();
  this.createModeDelegates({
    'script-': ScriptMode
  });
}
oop.inherits(Mode, TextMode);

(function () {
  this.getCompletions = function () {
    // autocomplete is done by the autocomplete module.
    return [];
  };

  this.getNextLineIndent = function (state, line, tab) {
    let indent = this.$getIndent(line);

    if (state !== 'string_literal') {
      const match = line.match(/^.*[\{\(\[]\s*$/);
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
    console.log('WORKER');
    const worker = new WorkerClient(['ace', 'sense_editor'], 'sense_editor/mode/worker', 'SenseWorker', 'sense_editor/mode/worker');
    console.log(worker);
    worker.attachToDocument(session.getDocument());

    worker.on('lint', function (results) {
      console.log('OL');
      session.setAnnotations(results.data);
    });
    worker.on('error', function (e) {
      console.log('OL');
      session.setAnnotations([e.data]);
    });

    worker.on('ok', function (anno) {
      console.log('OL');
      session.setAnnotations(anno.data);
    });

    return worker;
  };


}).call(Mode.prototype);
