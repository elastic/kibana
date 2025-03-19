/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { Control } from './control';
import { ControlParams } from '../editor_utils';
import { FilterManager as BaseFilterManager } from './filter_manager/filter_manager';

function createControlParams(id: string, label: string): ControlParams {
  return {
    id,
    options: {},
    label,
  } as ControlParams;
}

let valueFromFilterBar: any;
const mockFilterManager: BaseFilterManager = {
  getValueFromFilterBar: () => {
    return valueFromFilterBar;
  },
  createFilter: (value: any) => {
    return `mockKbnFilter:${value}` as any;
  },
  getIndexPattern: () => {
    return 'mockIndexPattern';
  },
} as any;

class ControlMock extends Control<BaseFilterManager> {
  fetch() {
    return Promise.resolve();
  }

  destroy() {}
}

describe('hasChanged', () => {
  let control: ControlMock;

  beforeEach(() => {
    control = new ControlMock(createControlParams('3', 'control'), mockFilterManager, false);
  });

  afterEach(() => {
    valueFromFilterBar = undefined;
  });

  test('should be false if value has not changed', () => {
    expect(control.hasChanged()).to.be(false);
  });

  test('should be true if value has been set', () => {
    control.set('new value');
    expect(control.hasChanged()).to.be(true);
  });

  test('should be false if value has been set and control is cleared', () => {
    control.set('new value');
    control.clear();
    expect(control.hasChanged()).to.be(false);
  });
});

describe('ancestors', () => {
  let grandParentControl: any;
  let parentControl: any;
  let childControl: any;
  beforeEach(() => {
    grandParentControl = new ControlMock(
      createControlParams('1', 'grandparent control'),
      mockFilterManager,
      false
    );
    parentControl = new ControlMock(
      createControlParams('2', 'parent control'),
      mockFilterManager,
      false
    );
    childControl = new ControlMock(
      createControlParams('3', 'child control'),
      mockFilterManager,
      false
    );
  });

  describe('hasUnsetAncestor', () => {
    test('should be true if parent is not set', function () {
      grandParentControl.set('myGrandParentValue');

      childControl.setAncestors([parentControl, grandParentControl]);
      expect(grandParentControl.hasValue()).to.be(true);
      expect(parentControl.hasValue()).to.be(false);
      expect(childControl.hasUnsetAncestor()).to.be(true);
    });

    test('should be true if grand parent is not set', function () {
      parentControl.set('myParentValue');

      childControl.setAncestors([parentControl, grandParentControl]);
      expect(grandParentControl.hasValue()).to.be(false);
      expect(parentControl.hasValue()).to.be(true);
      expect(childControl.hasUnsetAncestor()).to.be(true);
    });

    test('should be false if all ancestors are set', function () {
      grandParentControl.set('myGrandParentValue');
      parentControl.set('myParentValue');

      childControl.setAncestors([parentControl, grandParentControl]);
      expect(grandParentControl.hasValue()).to.be(true);
      expect(parentControl.hasValue()).to.be(true);
      expect(childControl.hasUnsetAncestor()).to.be(false);
    });
  });

  describe('getAncestorValues', () => {
    let lastAncestorValues: any[];
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
