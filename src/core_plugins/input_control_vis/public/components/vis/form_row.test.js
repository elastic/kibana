import React from 'react';
import { shallow } from 'enzyme';

import {
  FormRow,
} from './form_row';

test('renders enabled control', () => {
  const component = shallow(
    <FormRow
      label="test control"
      id="controlId"
      controlIndex={0}
    >
      <div>My Control</div>
    </FormRow>
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('renders disabled control with tooltip', () => {
  const component = shallow(
    <FormRow
      label="test control"
      id="controlId"
      disableMsg="I am disabled for testing purposes"
      controlIndex={0}
    >
      <div>My Control</div>
    </FormRow>
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
