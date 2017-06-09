import lzString from 'lz-string';

export const historyProvider = (win) => {
  const wh = win.history;

  return {
    undo() {
      wh.back();
    },

    redo() {
      wh.forward();
    },

    parse(payload) {
      try {
        const stateJSON = lzString.decompress(payload);
        return JSON.parse(stateJSON);
      } catch (e) {
        return null;
      }
    },

    push(state) {
      const stateJSON = JSON.stringify(state);
      const payload = lzString.compress(stateJSON);
      wh.pushState(payload, '');
    },

    setOnChange(fn) {
      if (fn == null) {
        win.onpopstate = null;
      } else {
        win.onpopstate = ({ state }) => {
          const stateObj = this.parse(state);
          fn.call(null, stateObj);
        };
      }
    },

    resetOnChange() {
      this.setOnChange(null);
    },
  };
};
