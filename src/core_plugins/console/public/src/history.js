import $ from 'jquery';
import storage from './storage';

const history = module.exports = {
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

  updateCurrentState(content) {
    var timestamp = new Date().getTime();
    storage.set("editor_state", {
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
