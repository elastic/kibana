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

import { Storage } from './index';

export class History {
  private editor: any;

  constructor(private readonly storage: Storage) {}

  setEditor(editor: any) {
    this.editor = editor;
  }

  // stupid simple restore function, called when the user
  // chooses to restore a request from the history
  // PREVENTS history from needing to know about the input
  restoreFromHistory(req: any) {
    const session = this.editor.getSession();
    let pos = this.editor.getCursorPosition();
    let prefix = '';
    let suffix = '\n';
    if (this.editor.parser.isStartRequestRow(pos.row)) {
      pos.column = 0;
      suffix += '\n';
    } else if (this.editor.parser.isEndRequestRow(pos.row)) {
      const line = session.getLine(pos.row);
      pos.column = line.length;
      prefix = '\n\n';
    } else if (this.editor.parser.isInBetweenRequestsRow(pos.row)) {
      pos.column = 0;
    } else {
      pos = this.editor.nextRequestEnd(pos);
      prefix = '\n\n';
    }

    let s = prefix + req.method + ' ' + req.endpoint;
    if (req.data) {
      s += '\n' + req.data;
    }

    s += suffix;

    session.insert(pos, s);
    this.editor.clearSelection();
    this.editor.moveCursorTo(pos.row + prefix.length, 0);
    this.editor.focus();
  }

  getHistoryKeys() {
    return this.storage
      .keys()
      .filter((key: string) => key.indexOf('hist_elem') === 0)
      .sort()
      .reverse();
  }

  getHistory() {
    return this.getHistoryKeys().map(key => this.storage.get(key));
  }

  addToHistory(endpoint: string, method: string, data: any) {
    const keys = this.getHistoryKeys();
    keys.splice(0, 500); // only maintain most recent X;
    $.each(keys, (i, k) => {
      this.storage.delete(k);
    });

    const timestamp = new Date().getTime();
    const k = 'hist_elem_' + timestamp;
    this.storage.set(k, {
      time: timestamp,
      endpoint,
      method,
      data,
    });
  }

  updateCurrentState(content: any) {
    const timestamp = new Date().getTime();
    this.storage.set('editor_state', {
      time: timestamp,
      content,
    });
  }

  getSavedEditorState() {
    const saved = this.storage.get('editor_state');
    if (!saved) return;
    const { time, content } = saved;
    return { time, content };
  }

  clearHistory() {
    this.getHistoryKeys().forEach(key => this.storage.delete(key));
  }
}

export function createHistory(deps: { storage: Storage }) {
  return new History(deps.storage);
}
