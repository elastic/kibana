import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';

import {
  ListControlEditor,
} from './list_control_editor';

const getIndexPatterns = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const resp = {
        savedObjects: [
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
        ]
      };
      resolve(resp);
    }, 0);
  });
};
const getIndexPattern = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const indexPattern = {
        fields: [
          { name: 'keywordField', type: 'string', aggregatable: true },
          { name: 'textField', type: 'string', aggregatable: false },
          { name: 'numberField', type: 'number', aggregatable: true }
        ]
      };
      resolve(indexPattern);
    }, 0);
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
let handleMultiselectChange;
let handleSizeChange;

beforeEach(() => {
  handleFieldNameChange = sinon.spy();
  handleIndexPatternChange = sinon.spy();
  handleMultiselectChange = sinon.spy();
  handleSizeChange = sinon.spy();
});

test('renders ListControlEditor', () => {
  const component = shallow(<ListControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleMultiselectChange={handleMultiselectChange}
    handleSizeChange={handleSizeChange}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('handleMultiselectChange', () => {
  const component = mount(<ListControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleMultiselectChange={handleMultiselectChange}
    handleSizeChange={handleSizeChange}
  />);
  const checkbox = component.find('#multiselect-0');
  checkbox.simulate('change', { target: { checked: true } });
  sinon.assert.calledOnce(handleMultiselectChange);
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  sinon.assert.notCalled(handleSizeChange);
});

test('handleSizeChange', () => {
  const component = mount(<ListControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleMultiselectChange={handleMultiselectChange}
    handleSizeChange={handleSizeChange}
  />);
  const input = component.find('#size-0');
  input.simulate('change', { target: { value: 7 } });
  sinon.assert.notCalled(handleMultiselectChange);
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  sinon.assert.calledOnce(handleSizeChange);
});
