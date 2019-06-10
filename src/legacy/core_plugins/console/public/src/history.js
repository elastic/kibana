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

const $ = require('jquery');
const storage = require('./storage');

const history = {
  restoreFromHistory() {
    // default method for history.restoreFromHistory
    // replace externally to do something when the user chooses
    // to relive a bit of history
    throw new Error('not implemented');
  },

  getHistoryKeys() {
    return storage.keys()
      .filter(key => key.indexOf('hist_elem') === 0)
      .sort()
      .reverse();
  },

  getHistory() {
    return history
      .getHistoryKeys()
      .map(key => storage.get(key));
  },

  addToHistory(endpoint, method, data) {
    const keys = history.getHistoryKeys();
    keys.splice(0, 500); // only maintain most recent X;
    $.each(keys, function (i, k) {
      storage.delete(k);
    });

    const timestamp = new Date().getTime();
    const k = 'hist_elem_' + timestamp;
    storage.set(k, {
      time: timestamp,
      endpoint: endpoint,
      method: method,
      data: data
    });
  },

  updateCurrentState(content) {
    const timestamp = new Date().getTime();
    storage.set('editor_state', {
      time: timestamp,
      content: content
    });
  },

  getSavedEditorState() {
    const saved = storage.get('editor_state');
    if (!saved) return;
    const { time, content } = saved;
    return { time, content };
  },

  clearHistory() {
    history
      .getHistoryKeys()
      .forEach(key => storage.delete(key));
  }
};

export default history;
