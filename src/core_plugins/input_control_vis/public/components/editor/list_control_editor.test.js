import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';

import {
  ListControlEditor,
} from './list_control_editor';

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
  fieldName: 'keywordField',
  label: 'custom label',
  type: 'list',
  options: {
    type: 'terms',
    multiselect: true,
    size: 10
  }
};
let handleFieldNameChange;
let handleIndexPatternChange;
let handleCheckboxOptionChange;
let handleNumberOptionChange;

beforeEach(() => {
  handleFieldNameChange = sinon.spy();
  handleIndexPatternChange = sinon.spy();
  handleCheckboxOptionChange = sinon.spy();
  handleNumberOptionChange = sinon.spy();
});

test('renders ListControlEditor', () => {
  const component = shallow(<ListControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={[]}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('parentCandidates', () => {
  const parentCandidates = [
    { value: '1', text: 'fieldA' },
    { value: '2', text: 'fieldB' }
  ];
  const component = shallow(<ListControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={parentCandidates}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('handleCheckboxOptionChange - multiselect', () => {
  const component = mount(<ListControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={[]}
  />);
  const checkbox = findTestSubject(component, 'listControlMultiselectInput');
  checkbox.simulate('change', { target: { checked: true } });
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  sinon.assert.notCalled(handleNumberOptionChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'multiselect';
  sinon.assert.calledWith(
    handleCheckboxOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match((evt) => {
      if (evt.target.checked === true) {
        return true;
      }
      return false;
    }, 'unexpected checkbox input event'));
});

test('handleNumberOptionChange - size', () => {
  const component = mount(<ListControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleCheckboxOptionChange={handleCheckboxOptionChange}
    handleNumberOptionChange={handleNumberOptionChange}
    handleParentChange={() => {}}
    parentCandidates={[]}
  />);
  const input = findTestSubject(component, 'listControlSizeInput');
  input.simulate('change', { target: { value: 7 } });
  sinon.assert.notCalled(handleCheckboxOptionChange);
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  const expectedControlIndex = 0;
  const expectedOptionName = 'size';
  sinon.assert.calledWith(
    handleNumberOptionChange,
    expectedControlIndex,
    expectedOptionName,
    sinon.match((evt) => {
      if (evt.target.value === 7) {
        return true;
      }
      return false;
    }, 'unexpected input event'));
});
