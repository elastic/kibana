import expect from 'expect.js';
import proxyquire from 'proxyquire';
import { get } from 'lodash';
import actionCreator from './fixtures/action_creator';

const reducer = proxyquire('../elements', {
  '../actions/elements': {
    setElementExpression: 'setElementExpression',
    '@noCallThru': true,
  },
}).default;

describe('elements reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      id: 'workpad-1',
      pages: [{
        id: 'page-1',
        elements: [{
          id: 'element-0',
          expression: '',
        }, {
          id: 'element-1',
          expression: 'demodata()',
        }],
      }],
    };
  });

  it('updates element expression and ast by id', () => {
    const expression = 'test expression';
    const action = actionCreator('setElementExpression')({
      expression,
      pageId: 'page-1',
      element: { id: 'element-1' },
    });
    const expected = {
      id: 'element-1',
      expression,
    };

    const newState = reducer(state, action);
    const newElement = get(newState, ['pages', 0, 'elements', 1]);

    expect(newElement).to.eql(expected);
  });
});
