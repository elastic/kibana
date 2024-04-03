/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { EuiButton } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { ActionInternal } from '@kbn/ui-actions-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { getFieldCategorizeButton } from './field_categorize_button';
import {
  CATEGORIZE_FIELD_TRIGGER,
  ACTION_CATEGORIZE_FIELD,
  type CategorizeFieldContext,
} from '@kbn/ml-ui-actions';
import { TriggerContract } from '@kbn/ui-actions-plugin/public/triggers';

const ORIGINATING_APP = 'test';
const mockExecuteAction = jest.fn();
const uiActions = uiActionsPluginMock.createStartContract();
const categorizeAction = new ActionInternal({
  type: ACTION_CATEGORIZE_FIELD,
  id: ACTION_CATEGORIZE_FIELD,
  getDisplayName: () => 'test',
  isCompatible: async () => true,
  execute: async (context: CategorizeFieldContext) => {
    mockExecuteAction(context);
  },
  getHref: async () => '/app/test',
});

jest
  .spyOn(uiActions, 'getTriggerCompatibleActions')
  .mockResolvedValue([categorizeAction as ActionInternal<object>]);
jest.spyOn(uiActions, 'getTrigger').mockReturnValue({
  id: ACTION_CATEGORIZE_FIELD,
  exec: mockExecuteAction,
} as unknown as TriggerContract<object>);

describe('UnifiedFieldList <FieldCategorizeButton />', () => {
  it('should render correctly', async () => {
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    let wrapper: ReactWrapper;

    const button = await getFieldCategorizeButton({
      field,
      dataView,
      originatingApp: ORIGINATING_APP,
      uiActions,
    });
    await act(async () => {
      wrapper = await mountWithIntl(button!);
    });

    await wrapper!.update();

    expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith(CATEGORIZE_FIELD_TRIGGER, {
      dataView,
      field,
    });

    expect(wrapper!.text()).toBe('Run pattern analysis');
    wrapper!.find(`button[data-test-subj="fieldCategorize-${fieldName}"]`).simulate('click');

    expect(mockExecuteAction).toHaveBeenCalledWith({
      dataView,
      field,
      originatingApp: ORIGINATING_APP,
    });

    expect(wrapper!.find(EuiButton).exists()).toBeTruthy();
  });

  it('should not render for non text field', async () => {
    const fieldName = 'phpmemory';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    const button = await getFieldCategorizeButton({
      field,
      dataView,
      originatingApp: ORIGINATING_APP,
      uiActions,
    });

    expect(button).toBe(null);
  });
});
