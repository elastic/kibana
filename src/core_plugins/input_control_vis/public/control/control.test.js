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
const mockKbnApi = {};

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

  describe('getAncestorValues', () => {

    let lastAncestorValues;
    beforeEach(() => {
      grandParentControl.set('myGrandParentValue');
      parentControl.set('myParentValue');
      childControl.setAncestors([parentControl, grandParentControl]);
      lastAncestorValues = childControl.getAncestorValues();
    });

    test('should be the same when ancestor values have not changed', function () {
      const newAncestorValues = childControl.getAncestorValues();
      expect(newAncestorValues).to.eql(lastAncestorValues);
    });

    test('should be different when grand parent value changes', function () {
      grandParentControl.set('new myGrandParentValue');
      const newAncestorValues = childControl.getAncestorValues();
      expect(newAncestorValues).to.not.eql(lastAncestorValues);
    });

    test('should be different when parent value changes', function () {
      parentControl.set('new myParentValue');
      const newAncestorValues = childControl.getAncestorValues();
      expect(newAncestorValues).to.not.eql(lastAncestorValues);
    });
  });

  test('should build filters from ancestors', function () {
    grandParentControl.set('myGrandParentValue');
    parentControl.set('myParentValue');

    childControl.setAncestors([parentControl, grandParentControl]);

    const ancestorFilters = childControl.getAncestorFilters();
    expect(ancestorFilters.length).to.be(2);
    expect(ancestorFilters[0]).to.eql('mockKbnFilter:myParentValue');
    expect(ancestorFilters[1]).to.eql('mockKbnFilter:myGrandParentValue');
  });
});
