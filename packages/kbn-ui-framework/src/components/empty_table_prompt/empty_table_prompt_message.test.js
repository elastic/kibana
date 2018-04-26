import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEmptyTablePromptMessage,
} from './empty_table_prompt_message';

test('renders KuiEmptyTablePromptMessage', () => {
  const component = <KuiEmptyTablePromptMessage {...requiredProps}>children</KuiEmptyTablePromptMessage>;
  expect(render(component)).toMatchSnapshot();
});
