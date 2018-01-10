import lzString from 'lz-string';

function createHistoryInstance(win) {
  const wh = win.history;
  const historyState = {
    onChange: [],
  };

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

    encode(state) {
      const stateJSON = JSON.stringify(state);
      return lzString.compress(stateJSON);
    },

    push(state) {
      wh.pushState(this.encode(state), '');
    },

    replace(state) {
      wh.replaceState(this.encode(state), '');
    },

    onChange(fn) {
      // if no handler fn passed, do nothing
      if (fn == null) return;

      // create onChange handler using fn
      const changeFn = ({ state }) => {
        const stateObj = this.parse(state);
        fn.call(null, stateObj);
      };

      // add the onChange handler to the cache so it can be cleaned up later
      historyState.onChange.push(changeFn);

      win.addEventListener('popstate', changeFn, false);

      // return a function to tear down the change listener
      return () => {
        win.removeEventListener('popstate', changeFn, false);
      };
    },

    resetOnChange() {
      // splice to clear the onChange array, and remove listener for each fn
      historyState.onChange.splice(0).forEach(changeFn => {
        win.removeEventListener('popstate', changeFn, false);
      });
    },
  };
}

const instances = new WeakMap();

export const historyProvider = win => {
  const instance = instances.get(win);
  if (instance) return instance;

  const newInstance = createHistoryInstance(win);
  instances.set(win, newInstance);
  return newInstance;
};
