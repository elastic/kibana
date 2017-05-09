import expect from 'expect.js';
import proxyquire from 'proxyquire';
import { get } from 'lodash';
import actionCreator from './fixtures/action_creator';

const reducer = proxyquire('../elements', {
  '../actions/elements': {
    setAstAndExpression: 'setElementAstAndExpression',
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
          ast: '',
        }, {
          id: 'element-1',
          expression: 'demodata()',
          ast: {
            type: 'expression',
            chain: [{
              type: 'function',
              function: 'demodata',
              arguments: {},
            }],
          },
        }],
      }],
    };
  });

  it('updates element expression and ast by id', () => {
    const expression = 'test expression';
    const ast = 'test ast';
    const action = actionCreator('setElementAstAndExpression')({
      expression,
      ast,
      pageId: 'page-1',
      element: { id: 'element-1' },
    });
    const expected = {
      id: 'element-1',
      expression,
      ast,
    };

    const newState = reducer(state, action);
    const newElement = get(newState, ['pages', 0, 'elements', 1]);

    expect(newElement).to.eql(expected);
  });
});
