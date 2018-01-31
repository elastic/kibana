import expect from 'expect.js';
import { Control } from './control';

function createControlParams(id, label) {
  return {
    id: id,
    options: {},
    label: label
  };
}

const UNSET_VALUE = '';
const mockFilterManager = {
  getValueFromFilterBar: () => {
    return '';
  },
  createFilter: (value) => {
    return `mockKbnFilter:${value}`;
  },
  getUnsetValue: () => { return UNSET_VALUE; },
  getIndexPattern: () => { return 'mockIndexPattern'; }
};

class MockSearchSource {
  inherits(parent) {
    if (parent) {
      this._parent = parent;
    }
  }

  index() {
    // noop
  }

  filter(func) {
    this._createFilterFn = func;
  }
}

const mockKbnApi = {
  SearchSource: MockSearchSource
};

describe('ancestors', () => {

  let grandParentControl;
  let parentControl;
  let childControl;
  beforeEach(() => {
    grandParentControl = new Control(createControlParams(1, 'grandparent control'), mockFilterManager, mockKbnApi);
    parentControl = new Control(createControlParams(2, 'parent control'), mockFilterManager, mockKbnApi);
    childControl = new Control(createControlParams(3, 'child control'), mockFilterManager, mockKbnApi);
  });

  describe('hasUnsetAncestor', () => {
    test('should be true if parent is not set', function () {
      grandParentControl.set('myGrandParentValue');

      childControl.setAncestors([parentControl, grandParentControl]);
      expect(childControl.hasUnsetAncestor()).to.be(true);
    });

    test('should be true if grand parent is not set', function () {
      parentControl.set('myParentValue');

      childControl.setAncestors([parentControl, grandParentControl]);
      expect(childControl.hasUnsetAncestor()).to.be(true);
    });

    test('should be false if all ancestors are set', function () {
      grandParentControl.set('myGrandParentValue');
      parentControl.set('myParentValue');

      childControl.setAncestors([parentControl, grandParentControl]);
      expect(childControl.hasUnsetAncestor()).to.be(false);
    });
  });

  describe('getAncestorSignature', () => {

    let lastAncestorSignature;
    beforeEach(() => {
      grandParentControl.set('myGrandParentValue');
      parentControl.set('myParentValue');
      childControl.setAncestors([parentControl, grandParentControl]);
      lastAncestorSignature = childControl.getAncestorSignature();
    });

    test('should be the same when ancestor values have not changed', function () {
      const newAncestorSignature = childControl.getAncestorSignature();
      expect(newAncestorSignature).to.be(lastAncestorSignature);
    });

    test('should be different when grand parent value changes', function () {
      grandParentControl.set('new myGrandParentValue');
      const newAncestorSignature = childControl.getAncestorSignature();
      expect(newAncestorSignature).to.not.eql(lastAncestorSignature);
    });

    test('should be different when parent value changes', function () {
      parentControl.set('new myParentValue');
      const newAncestorSignature = childControl.getAncestorSignature();
      expect(newAncestorSignature).to.not.eql(lastAncestorSignature);
    });
  });

  test('should build inherited SearchSource chain for ancestors', function () {
    grandParentControl.set('myGrandParentValue');
    parentControl.set('myParentValue');

    childControl.setAncestors([parentControl, grandParentControl]);

    const ancestorSearchSource = childControl.getAncestorSearchSource();
    expect(ancestorSearchSource._createFilterFn()).to.eql('mockKbnFilter:myGrandParentValue');
    const nextAncestorSearchSource = ancestorSearchSource._parent;
    expect(nextAncestorSearchSource._createFilterFn()).to.eql('mockKbnFilter:myParentValue');
  });
});
