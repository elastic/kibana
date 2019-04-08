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

import _ from 'lodash';
const ace = require('brace');
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

  output.append = function (val, foldPrevious, cb) {
    if (typeof foldPrevious === 'function') {
      cb = foldPrevious;
      foldPrevious = true;
    }
    if (_.isUndefined(foldPrevious)) {
      foldPrevious = true;
    }
    const session = output.getSession();
    const lastLine = session.getLength();
    if (foldPrevious) {
      output.moveCursorTo(Math.max(0, lastLine - 1), 0);
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
