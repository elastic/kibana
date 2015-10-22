const $ = require('jquery');
const { uniq } = require('lodash');
const storage = require('./storage');

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

  getHistoricalServers() {
    return uniq(history.getHistory().map(req => req.server));
  },

  addToHistory(server, endpoint, method, data) {
    var keys = history.getHistoryKeys();
    keys.splice(0, 500); // only maintain most recent X;
    $.each(keys, function (i, k) {
      storage.remove(k);
    });

    var timestamp = new Date().getTime();
    var k = "hist_elem_" + timestamp;
    storage.set(k, {
      time: timestamp,
      server: server,
      endpoint: endpoint,
      method: method,
      data: data
    });
  },

  updateCurrentState(server, content) {
    var timestamp = new Date().getTime();
    storage.set("editor_state", {
      time: timestamp,
      server: server,
      content: content
    });
  },

  getSavedEditorState(server, content) {
    return storage.get('editor_state');
  },

  clearHistory($el) {
    history
      .getHistoryKeys()
      .forEach(key => storage.delete(key));
  }
};
