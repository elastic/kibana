import expect from 'expect.js';
import lzString from 'lz-string';
import { historyProvider } from '../history_provider';
import { createWindow } from './fixtures/window';

function createState() {
  return {
    transient: {
      editing: false,
      selectedPage: 'page-f3ce-4bb7-86c8-0417606d6592',
      selectedElement: 'element-d88c-4bbd-9453-db22e949b92e',
      resolvedArgs: {},
    },
    persistent: {
      schemaVersion: 0,
      time: new Date().getTime(),
    },
  };
}

describe('historyProvider', () => {
  let history;
  let state;
  let win;

  function getListeners(name) {
    return win.listeners[name] || [];
  }

  beforeEach(() => {
    win = createWindow();
    history = historyProvider(win);
    state = createState();
  });

  describe('instances', () => {
    it('should return the same instance for the same window object', () => {
      expect(historyProvider(win)).to.be(history);
    });

    it('should return different instance for different window object', () => {
      const win2 = createWindow();
      expect(historyProvider(win2)).not.to.be(history);
    });
  });

  describe('push updates', () => {
    beforeEach(() => {
      history.push(state);
    });

    describe('push', () => {
      it('should push state into window history', () => {
        expect(win.history.pushState.calledOnce).to.be(true);
      });

      it('should push compressed state into history', () => {
        const { args } = win.history.pushState.firstCall;
        expect(args[0]).to.equal(lzString.compress(JSON.stringify(state)));
      });
    });

    describe('undo', () => {
      it('should move history back', () => {
        expect(win.history._getIndex()).to.equal(0);
        history.undo();
        expect(win.history._getIndex()).to.equal(-1);
      });
    });

    describe('redo', () => {
      it('should move history forward', () => {
        history.undo();
        expect(win.history._getIndex()).to.equal(-1);
        history.redo();
        expect(win.history._getIndex()).to.equal(0);
      });
    });
  });

  describe('replace updates', () => {
    beforeEach(() => {
      history.replace(state);
    });

    describe('replace', () => {
      it('should replace state in window history', () => {
        expect(win.history.replaceState.calledOnce).to.be(true);
      });

      it('should replace compressed state into history', () => {
        const { args } = win.history.replaceState.firstCall;
        expect(args[0]).to.equal(lzString.compress(JSON.stringify(state)));
      });
    });
  });

  describe('onChange', () => {
    it('should set the onpopstate handler', () => {
      const handler = () => 'hello world';
      expect(getListeners('popstate')).to.have.length(0);

      history.onChange(handler);
      expect(getListeners('popstate')).to.have.length(1);
      expect(getListeners('popstate')[0]).to.a('function');
    });

    it('should return a method to remove the listener', () => {
      const handler = () => 'hello world';
      const teardownFn = history.onChange(handler);

      expect(teardownFn).to.be.a('function');

      expect(getListeners('popstate')).to.have.length(1);
      teardownFn();
      expect(getListeners('popstate')).to.have.length(0);
    });

    it('should pass decompress state to handler', done => {
      history.push(state);

      const handler = curState => {
        expect(curState).to.eql(state);
        done();
      };

      history.onChange(handler);
      win.history._triggerChange();
    });
  });

  describe('resetOnChange', () => {
    it('resets the onpopstate handler', () => {
      const handler = () => 'hello world';
      history.onChange(handler);
      expect(getListeners('popstate')).to.have.length(1);
      expect(getListeners('popstate')[0]).to.a('function');

      history.resetOnChange();
      expect(getListeners('popstate')).to.have.length(0);
    });
  });

  describe('parse', () => {
    it('returns the decompressed object', () => {
      history.push(state);

      const historyState = win.history._getHistory().state;

      expect(historyState).to.be.a('string');
      expect(history.parse(historyState)).to.eql(state);
    });

    it('returns null with invalid JSON', () => {
      expect(history.parse('hello')).to.be(null);
    });
  });

  describe('encode', () => {
    it('returns the compressed string', () => {
      history.push(state);

      const historyState = win.history._getHistory().state;

      expect(historyState).to.be.a('string');
      expect(history.encode(state)).to.eql(historyState);
    });
  });
});
