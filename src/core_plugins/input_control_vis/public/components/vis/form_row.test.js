import React from 'react';
import { shallow } from 'enzyme';

import {
  FormRow,
} from './form_row';

test('renders enabled control', () => {
  const enabledControl = {
    id: 'mock-enabled-control',
    isEnabled: () => { return true; },
  };
  const component = shallow(
    <FormRow
      label="test control"
      id="controlId"
      control={enabledControl}
      controlIndex={0}
    >
      <div>My Control</div>
    </FormRow>
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('renders disabled control with tooltip', () => {
  const disabledControl = {
    id: 'mock-disabled-control',
    isEnabled: () => { return false; },
    disabledReason: 'I am disabled for testing purposes'
  };
  const component = shallow(
    <FormRow
      label="test control"
      id="controlId"
      control={disabledControl}
      controlIndex={0}
    >
      <div>My Control</div>
    </FormRow>
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
