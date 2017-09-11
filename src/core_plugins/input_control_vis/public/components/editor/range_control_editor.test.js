import React from 'react';
import sinon from 'sinon';
import { mount, shallow } from 'enzyme';

import {
  RangeControlEditor,
} from './range_control_editor';

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
let handleStepChange;
let handleDecimalPlacesChange;

beforeEach(() => {
  handleFieldNameChange = sinon.spy();
  handleIndexPatternChange = sinon.spy();
  handleStepChange = sinon.spy();
  handleDecimalPlacesChange = sinon.spy();
});

test('renders RangeControlEditor', () => {
  const component = shallow(<RangeControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleStepChange={handleStepChange}
    handleDecimalPlacesChange={handleDecimalPlacesChange}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('handleStepChange', () => {
  const component = mount(<RangeControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleStepChange={handleStepChange}
    handleDecimalPlacesChange={handleDecimalPlacesChange}
  />);
  const input = component.find('#stepSize-0');
  input.simulate('change', { target: { value: 0.5 } });
  sinon.assert.calledOnce(handleStepChange);
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  sinon.assert.notCalled(handleDecimalPlacesChange);
});

test('handleDecimalPlacesChange', () => {
  const component = mount(<RangeControlEditor
    getIndexPatterns={getIndexPatterns}
    getIndexPattern={getIndexPattern}
    controlIndex={0}
    controlParams={controlParams}
    handleFieldNameChange={handleFieldNameChange}
    handleIndexPatternChange={handleIndexPatternChange}
    handleStepChange={handleStepChange}
    handleDecimalPlacesChange={handleDecimalPlacesChange}
  />);
  const input = component.find('#decimalPlaces-0');
  input.simulate('change', { target: { value: 2 } });
  sinon.assert.notCalled(handleStepChange);
  sinon.assert.notCalled(handleFieldNameChange);
  sinon.assert.notCalled(handleIndexPatternChange);
  sinon.assert.calledOnce(handleDecimalPlacesChange);
});
