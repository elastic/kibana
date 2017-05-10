import expect from 'expect.js';
import * as selector from '../resolved_args';

describe('resolved args selector', () => {
  let state;

  beforeEach(() => {
    state = {
      resolvedArgs: {
        'test1': {
          state: 'ready',
          value: 'test value',
          error: null,
        },
        'test2': {
          state: 'pending',
          value: null,
          error: null,
        },
        'test3': {
          state: 'error',
          value: 'some old value',
          error: new Error('i have failed'),
        },
      },
    };
  });

  describe('getValue', () => {
    it('should return the state', () => {
      expect(selector.getState(state, 'test1')).to.equal('ready');
      expect(selector.getState(state, 'test2')).to.equal('pending');
      expect(selector.getState(state, 'test3')).to.equal('error');
    });

    it('should return the value', () => {
      expect(selector.getValue(state, 'test1')).to.equal('test value');
      expect(selector.getValue(state, 'test2')).to.equal(null);
      expect(selector.getValue(state, 'test3')).to.equal('some old value');
    });

    it('should return the value', () => {
      expect(selector.getError(state, 'test1')).to.equal(null);
      expect(selector.getError(state, 'test2')).to.equal(null);
      expect(selector.getError(state, 'test3')).to.be.an(Error);
      expect(selector.getError(state, 'test3').toString()).to.match(/i\ have\ failed$/);
    });
  });
});
