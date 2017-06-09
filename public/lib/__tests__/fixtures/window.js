import sinon from 'sinon';

export function createWindow() {
  // onpopstate is a noop spy by default
  let onpopstate = null;

  // history stack and pointer
  let historyIndex = -1;
  let historyItems = [];

  const history = {
    back() {
      if (historyIndex >= -1) {
        historyIndex -= 1;
        onpopstate && onpopstate.call(null, historyItems[historyIndex]);
      }
    },
    forward() {
      if (historyItems.length > historyIndex + 1) {
        historyIndex += 1;
        onpopstate && onpopstate.call(null, historyItems[historyIndex]);
      }
    },
    pushState(state, title = '', url = '') {
      historyItems.push({ state, title, url });
      historyIndex += 1;
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
      onpopstate.call(null, this._getHistory());
    },
  };

  return {
    history: {
      ...history,
      back: sinon.spy(history.back),
      forward: sinon.spy(history.forward),
      pushState: sinon.spy(history.pushState),
    },
    set onpopstate(fn) {
      onpopstate = (typeof fn === 'function') ? sinon.spy(fn) : null;
    },
    get onpopstate() {
      return onpopstate;
    },
  };
}
