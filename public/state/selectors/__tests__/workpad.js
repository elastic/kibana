import expect from 'expect.js';
import * as selector from '../workpad';

describe('workpad selectors', () => {
  let state;

  beforeEach(() => {
    state = {
      transient: {
        selectedPage: 'page-1',
        selectedElement: 'element-1',
        resolvedArgs: {
          'element-0': 'test resolved arg, el 0',
          'element-1': 'test resolved arg, el 1',
          'element-2': {
            example1: 'first thing',
            example2: ['why not', 'an array?'],
            example3: {
              deeper: {
                object: true,
              },
            },
          },
        },
      },
      persistent: {
        workpad: {
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
        },
      },
    };
  });

  describe('empty state', () => {
    it('returns undefined', () => {
      expect(selector.getSelectedPage({})).to.be(undefined);
      expect(selector.getPages({})).to.be(undefined);
      expect(selector.getPageById({}, 'page-1')).to.be(undefined);
      expect(selector.getSelectedElement({})).to.be(undefined);
      expect(selector.getSelectedElementId({})).to.be(undefined);
      expect(selector.getElements({})).to.be(undefined);
      expect(selector.getElementById({}, 'element-1')).to.be(undefined);
      expect(selector.getResolvedArgs({}, 'element-1')).to.be(undefined);
      expect(selector.getSelectedResolvedArgs({})).to.be(undefined);
    });
  });

  describe('getSelectedPage', () => {
    it('returns the selected page', () => {
      expect(selector.getSelectedPage(state)).to.equal('page-1');
    });
  });

  describe('getPages', () => {
    it('returns all pages in persisent state', () => {
      expect(selector.getPages(state)).to.equal(state.persistent.workpad.pages);
    });
  });

  describe('getPageById', () => {
    it('should return matching page', () => {
      expect(selector.getPageById(state, 'page-1')).to.equal(state.persistent.workpad.pages[0]);
    });
  });

  describe('getSelectedElement', () => {
    it('returns selected element', () => {
      const { elements } = state.persistent.workpad.pages[0];
      expect(selector.getSelectedElement(state)).to.equal(elements[1]);
    });
  });

  describe('getSelectedElementId', () => {
    it('returns selected element id', () => {
      expect(selector.getSelectedElementId(state)).to.equal('element-1');
    });
  });

  describe('getElements', () => {
    it('returns all elements on the page', () => {
      const { elements } = state.persistent.workpad.pages[0];
      expect(selector.getElements(state)).to.equal(elements);
    });
  });

  describe('getElementById', () => {
    it('returns element matching id', () => {
      const { elements } = state.persistent.workpad.pages[0];
      expect(selector.getElementById(state, 'element-0')).to.equal(elements[0]);
      expect(selector.getElementById(state, 'element-1')).to.equal(elements[1]);
    });
  });

  describe('getResolvedArgs', () => {
    it('returns resolved args by element id', () => {
      expect(selector.getResolvedArgs(state, 'element-0')).to.equal('test resolved arg, el 0');
    });

    it('returns resolved args at given path', () => {
      const arg = selector.getResolvedArgs(state, 'element-2', 'example1');
      expect(arg).to.equal('first thing');
    });
  });

  describe('getSelectedResolvedArgs', () => {
    it('returns resolved args for selected element', () => {
      expect(selector.getSelectedResolvedArgs(state)).to.equal('test resolved arg, el 1');
    });

    it('returns resolved args at given path', () => {
      const tmpState = {
        ...state,
        transient: {
          ...state.transient,
          selectedElement: 'element-2',
        },
      };
      const arg = selector.getSelectedResolvedArgs(tmpState, 'example2');
      expect(arg).to.eql(['why not', 'an array?']);
    });

    it('returns resolved args at given deep path', () => {
      const tmpState = {
        ...state,
        transient: {
          ...state.transient,
          selectedElement: 'element-2',
        },
      };
      const arg = selector.getSelectedResolvedArgs(tmpState, ['example3', 'deeper', 'object']);
      expect(arg).to.be(true);
    });
  });
});
