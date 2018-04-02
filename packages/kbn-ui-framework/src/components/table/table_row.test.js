import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableRow,
} from './table_row';

import {
  KuiTableRowCell
} from './table_row_cell';

test('renders KuiTableRow', () => {
  const component = (
    <KuiTableRow {...requiredProps}>
      <KuiTableRowCell>hi</KuiTableRowCell>
    </KuiTableRow>
  );
  expect(render(component)).toMatchSnapshot();
});
