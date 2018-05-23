import _ from 'lodash';
const ace = require('ace');
const settings = require('./settings');
const OutputMode = require('./sense_editor/mode/output');
const smartResize = require('./smart_resize');

let output;
export function initializeOutput($el) {
  output = ace.acequire('ace/ace').edit($el[0]);

  const outputMode = new OutputMode.Mode();

  output.$blockScrolling = Infinity;
  output.resize = smartResize(output);
  output.update = function (val, mode, cb) {
    if (typeof mode === 'function') {
      cb = mode;
      mode = void 0;
    }

    const session = output.getSession();

    session.setMode(val ? (mode || outputMode) : 'ace/mode/text');
    session.setValue(val);
    if (typeof cb === 'function') {
      setTimeout(cb);
    }
  };

  output.append = function (val, fold_previous, cb) {
    if (typeof fold_previous === 'function') {
      cb = fold_previous;
      fold_previous = true;
    }
    if (_.isUndefined(fold_previous)) {
      fold_previous = true;
    }
    const session = output.getSession();
    const lastLine = session.getLength();
    if (fold_previous) {
      output.moveCursorTo(Math.max(0, lastLine - 1), 0);
      session.toggleFold(false);

    }
    session.insert({ row: lastLine, column: 0 }, '\n' + val);
    output.moveCursorTo(lastLine + 1, 0);
    if (typeof cb === 'function') {
      setTimeout(cb);
    }
  };

  output.$el = $el;

  (function (session) {
    session.setMode('ace/mode/text');
    session.setFoldStyle('markbeginend');
    session.setTabSize(2);
    session.setUseWrapMode(true);
  }(output.getSession()));

  output.setShowPrintMargin(false);
  output.setReadOnly(true);

  if (settings) {
    settings.applyCurrentSettings(output);
  }

  return output;
}

export default function getOutput() {
  return output;
}
