import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableRowCheckBoxCell,
} from './table_row_check_box_cell';

test('renders KuiTableRowCheckBoxCell', () => {
  const component = <KuiTableRowCheckBoxCell {...requiredProps} />;
  expect(render(component)).toMatchSnapshot();
});
