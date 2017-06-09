import expect from 'expect.js';
import lzString from 'lz-string';
import { createWindow } from './fixtures/window';
import { historyProvider } from '../history_provider';

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

  beforeEach(() => {
    win = createWindow();
    history = historyProvider(win);
    state = createState();
  });

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

  describe('setOnChange', () => {
    it('should set the onpopstate handler', () => {
      const handler = () => 'hello world';
      expect(win.onpopstate).to.be(null);
      history.setOnChange(handler);
      expect(win.onpopstate).to.be.a('function');
    });

    it('should pass decompress state to handler', (done) => {
      const handler = (state) => {
        expect(state).to.eql(state);
        done();
      };

      history.setOnChange(handler);
      win.history._triggerChange();
    });
  });

  describe('resetOnChange', () => {
    it('resets the onpopstate handler', () => {
      const handler = () => 'hello world';
      history.setOnChange(handler);
      expect(win.onpopstate).to.be.a('function');

      history.resetOnChange();
      expect(win.onpopstate).to.be(null);
    });
  });

  describe('parse', () => {
    it('returns the decompressed object', () => {
      const historyState = win.history._getHistory().state;
      expect(historyState).to.be.a('string');
      expect(history.parse(historyState)).to.eql(state);
    });

    it('returns null with invalid JSON', () => {
      expect(history.parse('hello')).to.be(null);
    });
  });
});
