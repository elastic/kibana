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
    var keys = history.getHistoryKeys();
    keys.splice(0, 500); // only maintain most recent X;
    $.each(keys, function (i, k) {
      storage.delete(k);
    });

    var timestamp = new Date().getTime();
    var k = "hist_elem_" + timestamp;
    storage.set(k, {
      time: timestamp,
      endpoint: endpoint,
      method: method,
      data: data
    });
  },

  updateCurrentState(content, workspaceId) {
    const k = "editor_state" + (workspaceId || "");
    const timestamp = new Date().getTime();
    storage.set(k, {
      time: timestamp,
      content: content
    });
  },

  getSavedEditorState(workspaceId) {
    const k = "editor_state" + (workspaceId || "");
    const saved = storage.get(k);
    if (!saved) return;
    const { time, content } = saved;
    return { time, content };
  },

  getWorkspaceKeys() {
    return storage.keys()
      .filter(key => key.indexOf("editor_state") === 0)
      .sort();
  },

  getWorkspaceIds() {
    return history.getWorkspaceKeys()
      .map(key => key.replace("editor_state", ""));
  },

  getWorkspaces() {
    return history.getWorkspaceKeys()
      .map(key => storage.get(key));
  },

  deleteWorkspace(workspaceId) {
    storage.delete("editor_state" + (workspaceId || ""));
  },

  clearHistory() {
    history
      .getHistoryKeys()
      .forEach(key => storage.delete(key));
  }
};

export default history;
