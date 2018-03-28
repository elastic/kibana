import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';

import {
  RangeControlEditor,
} from './range_control_editor';

const getIndexPatterns = () => {
  return Promise.resolve([
    {
      id: 'indexPattern1',
      attributes: {
        title: 'indexPattern1'
      }
    },
    {
      id: 'indexPattern2',
      attributes: {
        title: 'indexPattern2'
      }
    }
  ]);
};
const getIndexPattern = () => {
  return Promise.resolve({
    fields: [
      { name: 'keywordField', type: 'string', aggregatable: true },
      { name: 'textField', type: 'string', aggregatable: false },
      { name: 'numberField', type: 'number', aggregatable: true }
    ]
  });
};
const controlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'numberField',
  label: 'custom label',
  type: 'range',
  options: {
    decimalPlaces: 0,
    step: 1
  }
};
let handleFieldNameChange;
let handleIndexPatternChange;
let handleNumberOptionChange;

beforeEach(() => {
  handleFieldNameChange = sinon.spy();
  handleIndexPatternChange = sinon.spy();
  handleNumberOptionChange = sinon.spy();
});

test('renders RangeControlEditor', () => {
  const component = shallow(<RangeControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleNumberOptionChange={handleNumberOptionChange}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('handleNumberOptionChange - step', () => {
  const component = mount(<RangeControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleNumberOptionChange={handleNumberOptionChange}
  />);
  findTestSubject(component, 'rangeControlSizeInput0').simulate('change', { target: { value: 0.5 } });
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'step';
  sinon.assert.calledWith(
    handleNumberOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match((evt) => {
      if (evt.target.value === 0.5) {
        return true;
      }
      return false;
    }, 'unexpected input event'));
});

test('handleNumberOptionChange - decimalPlaces', () => {
  const component = mount(<RangeControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleNumberOptionChange={handleNumberOptionChange}
  />);
  findTestSubject(component, 'rangeControlDecimalPlacesInput0').simulate('change', { target: { value: 2 } });
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'decimalPlaces';
  sinon.assert.calledWith(
    handleNumberOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match((evt) => {
      if (evt.target.value === 2) {
        return true;
      }
      return false;
    }, 'unexpected input event'));
});
