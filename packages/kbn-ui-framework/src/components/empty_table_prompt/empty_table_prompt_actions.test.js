import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEmptyTablePromptActions,
} from './empty_table_prompt_actions';

test('renders KuiEmptyTablePromptActions', () => {
  const component = <KuiEmptyTablePromptActions {...requiredProps}>children</KuiEmptyTablePromptActions>;
  expect(render(component)).toMatchSnapshot();
});
