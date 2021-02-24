/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import ace from 'brace';
// @ts-ignore
import * as OutputMode from './mode/output';
import smartResize from './smart_resize';

export interface CustomAceEditor extends ace.Editor {
  update: (text: string, mode?: any, cb?: () => void) => void;
  append: (text: string, foldPrevious?: boolean, cb?: () => void) => void;
}

/**
 * Note: using read-only ace editor leaks the Ace editor API - use this as sparingly as possible or
 * create an interface for it so that we don't rely directly on vendor APIs.
 */
export function createReadOnlyAceEditor(element: HTMLElement): CustomAceEditor {
  const output: CustomAceEditor = ace.acequire('ace/ace').edit(element);

  const outputMode = new OutputMode.Mode();

  output.$blockScrolling = Infinity;
  output.resize = smartResize(output);
  output.update = (val: string, mode?: any, cb?: () => void) => {
    if (typeof mode === 'function') {
      cb = mode;
      mode = void 0;
    }

    const session = output.getSession();

    session.setMode(val ? mode || outputMode : 'ace/mode/text');
    session.setValue(val);
    if (typeof cb === 'function') {
      setTimeout(cb);
    }
  };

  output.append = (val: string, foldPrevious?: boolean, cb?: () => void) => {
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

  (function setupSession(session) {
    session.setMode('ace/mode/text');
    (session as any).setFoldStyle('markbeginend');
    session.setTabSize(2);
    session.setUseWrapMode(true);
  })(output.getSession());

  output.setShowPrintMargin(false);
  output.setReadOnly(true);

  return output;
}
