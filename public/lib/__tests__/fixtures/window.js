import sinon from 'sinon';

export function createWindow() {
  // history stack and pointer
  let historyIndex = -1;
  let historyItems = [];

  // listeners added via addListener
  const listeners = {};

  const history = {
    back() {
      if (historyIndex >= -1) {
        historyIndex -= 1;
        listeners.popstate &&
          listeners.popstate.forEach(fn => fn.call(null, historyItems[historyIndex]));
      }
    },
    forward() {
      if (historyItems.length > historyIndex + 1) {
        historyIndex += 1;
        listeners.popstate &&
          listeners.popstate.forEach(fn => fn.call(null, historyItems[historyIndex]));
      }
    },
    pushState(state, title = '', url = '') {
      historyItems.push({ state, title, url });
      historyIndex += 1;
    },
    replaceState(state, title = '', url = '') {
      const index = this._getIndex();
      if (index >= 0) historyItems[index] = { state, title, url };
      else this.pushState(state, title, url);
    },
    _reset() {
      historyIndex = -1;
      historyItems = [];
    },
    _getHistory(idx) {
      return historyItems[idx || historyIndex];
    },
    _getIndex() {
      return historyIndex;
    },
    _triggerChange() {
      listeners.popstate && listeners.popstate.forEach(fn => fn.call(null, this._getHistory()));
    },
  };

  return {
    history: {
      ...history,
      back: sinon.spy(history.back),
      forward: sinon.spy(history.forward),
      pushState: sinon.spy(history.pushState),
      replaceState: sinon.spy(history.replaceState),
    },
    addEventListener(name, fn) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(fn);
    },
    removeEventListener(name, fn) {
      if (!listeners[name]) return;

      const listenerIndex = listeners[name].findIndex(listenFn => listenFn === fn);
      if (~listenerIndex) listeners[name].splice(listenerIndex, 1);
    },
    get listeners() {
      return { ...listeners };
    },
  };
}
