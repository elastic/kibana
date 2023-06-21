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
import { getFieldVisualizeButton } from './field_visualize_button';
import {
  ACTION_VISUALIZE_LENS_FIELD,
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
  VisualizeFieldContext,
} from '@kbn/ui-actions-plugin/public';
import { TriggerContract } from '@kbn/ui-actions-plugin/public/triggers';

const ORIGINATING_APP = 'test';
const mockExecuteAction = jest.fn();
const uiActions = uiActionsPluginMock.createStartContract();
const visualizeAction = new ActionInternal({
  type: ACTION_VISUALIZE_LENS_FIELD,
  id: ACTION_VISUALIZE_LENS_FIELD,
  getDisplayName: () => 'test',
  isCompatible: async () => true,
  execute: async (context: VisualizeFieldContext) => {
    mockExecuteAction(context);
  },
  getHref: async () => '/app/test',
});

jest
  .spyOn(uiActions, 'getTriggerCompatibleActions')
  .mockResolvedValue([visualizeAction as ActionInternal<object>]);
jest.spyOn(uiActions, 'getTrigger').mockReturnValue({
  id: ACTION_VISUALIZE_LENS_FIELD,
  exec: mockExecuteAction,
} as unknown as TriggerContract<object>);

describe('UnifiedFieldList <FieldVisualizeButton />', () => {
  it('should render correctly', async () => {
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    const fieldNameKeyword = 'extension.keyword';
    const fieldKeyword = dataView.fields.find((f) => f.name === fieldNameKeyword)!;
    const contextualFields = ['bytes'];
    jest.spyOn(field, 'visualizable', 'get').mockImplementationOnce(() => false);
    jest.spyOn(fieldKeyword, 'visualizable', 'get').mockImplementationOnce(() => true);
    let wrapper: ReactWrapper;

    const button = await getFieldVisualizeButton({
      field,
      dataView,
      multiFields: [fieldKeyword],
      contextualFields,
      originatingApp: ORIGINATING_APP,
      uiActions,
    });
    await act(async () => {
      wrapper = await mountWithIntl(button!);
    });

    await wrapper!.update();

    expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith(VISUALIZE_FIELD_TRIGGER, {
      contextualFields,
      dataViewSpec: dataView.toSpec(false),
      fieldName: fieldNameKeyword,
    });

    expect(wrapper!.text()).toBe('Visualize');
    wrapper!.find('a[data-test-subj="fieldVisualize-extension"]').simulate('click');

    expect(mockExecuteAction).toHaveBeenCalledWith({
      contextualFields,
      dataViewSpec: dataView.toSpec(false),
      fieldName: fieldNameKeyword,
      originatingApp: ORIGINATING_APP,
    });

    expect(wrapper!.find(EuiButton).prop('href')).toBe('/app/test');
  });

  it('should render correctly for geo fields', async () => {
    const fieldName = 'geo.coordinates';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    jest.spyOn(field, 'visualizable', 'get').mockImplementationOnce(() => true);
    let wrapper: ReactWrapper;

    const button = await getFieldVisualizeButton({
      field,
      dataView,
      originatingApp: ORIGINATING_APP,
      uiActions,
    });
    await act(async () => {
      wrapper = await mountWithIntl(button!);
    });

    await wrapper!.update();

    expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith(
      VISUALIZE_GEO_FIELD_TRIGGER,
      {
        contextualFields: [],
        dataViewSpec: dataView.toSpec(false),
        fieldName,
      }
    );

    expect(wrapper!.text()).toBe('Visualize');
    wrapper!.find('a[data-test-subj="fieldVisualize-geo.coordinates"]').simulate('click');

    expect(mockExecuteAction).toHaveBeenCalledWith({
      contextualFields: [],
      dataViewSpec: dataView.toSpec(false),
      fieldName,
      originatingApp: ORIGINATING_APP,
    });
  });
});
