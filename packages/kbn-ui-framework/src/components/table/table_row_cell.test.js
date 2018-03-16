import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableRowCell,
} from './table_row_cell';

test('renders KuiTableRowCell', () => {
  const component = <KuiTableRowCell {...requiredProps} />;
  expect(render(component)).toMatchSnapshot();
});
