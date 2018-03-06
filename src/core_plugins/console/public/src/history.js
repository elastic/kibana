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
