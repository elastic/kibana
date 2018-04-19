import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEmptyTablePromptPanel,
} from './empty_table_prompt_panel';

test('renders KuiEmptyTablePromptPanel', () => {
  const component = <KuiEmptyTablePromptPanel {...requiredProps}>children</KuiEmptyTablePromptPanel>;
  expect(render(component)).toMatchSnapshot();
});
