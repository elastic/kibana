/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { ACTION_VISUALIZE_LENS_FIELD, ActionInternal } from '@kbn/ui-actions-plugin/public';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { getFieldVisualizeButton } from './field_visualize_button';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import {
  VISUALIZE_FIELD_TRIGGER,
  VISUALIZE_GEO_FIELD_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const ORIGINATING_APP = 'test';

const uiActions = uiActionsPluginMock.createStartContract();

const mockExecuteAction = jest.fn();

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

describe('UnifiedFieldList <FieldVisualizeButton />', () => {
  it('should render correctly', async () => {
    const user = userEvent.setup();
    const FIELD_NAME = 'extension';
    const field = dataView.fields.find((f) => f.name === FIELD_NAME)!;

    const FIELD_NAME_KEYWORD = 'extension.keyword';
    const fieldKeyword = dataView.fields.find((f) => f.name === FIELD_NAME_KEYWORD)!;

    const contextualFields = ['bytes'];

    jest.spyOn(field, 'visualizable', 'get').mockImplementationOnce(() => false);
    jest.spyOn(fieldKeyword, 'visualizable', 'get').mockImplementationOnce(() => true);

    const visualizeButton = await getFieldVisualizeButton({
      field,
      dataView,
      multiFields: [fieldKeyword],
      contextualFields,
      originatingApp: ORIGINATING_APP,
      uiActions,
    });

    renderWithI18n(visualizeButton);

    expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith(VISUALIZE_FIELD_TRIGGER, {
      contextualFields,
      dataViewSpec: dataView.toSpec(false),
      fieldName: FIELD_NAME_KEYWORD,
    });

    const visualizeLink = screen.getByText('Visualize');
    expect(visualizeLink).toBeVisible();
    expect(visualizeLink.closest('a')).toHaveAttribute('href', '/app/test');

    await user.click(visualizeLink);

    expect(uiActions.executeTriggerActions).toHaveBeenCalledWith(VISUALIZE_FIELD_TRIGGER, {
      contextualFields,
      dataViewSpec: dataView.toSpec(false),
      fieldName: FIELD_NAME_KEYWORD,
      originatingApp: ORIGINATING_APP,
    });
  });

  it('should render correctly for geo fields', async () => {
    const user = userEvent.setup();
    const FIELD_NAME = 'geo.coordinates';
    const field = dataView.fields.find((f) => f.name === FIELD_NAME)!;

    jest.spyOn(field, 'visualizable', 'get').mockImplementationOnce(() => true);

    const visualizeButton = await getFieldVisualizeButton({
      field,
      dataView,
      originatingApp: ORIGINATING_APP,
      uiActions,
    });

    renderWithI18n(visualizeButton);

    expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith(
      VISUALIZE_GEO_FIELD_TRIGGER,
      {
        contextualFields: [],
        dataViewSpec: dataView.toSpec(false),
        fieldName: FIELD_NAME,
      }
    );

    const visualizeLink = screen.getByText('Visualize');
    expect(visualizeLink).toBeVisible();
    expect(visualizeLink.closest('a')).toHaveAttribute('href', '/app/test');

    await user.click(visualizeLink);

    expect(uiActions.executeTriggerActions).toHaveBeenCalledWith(VISUALIZE_GEO_FIELD_TRIGGER, {
      contextualFields: [],
      dataViewSpec: dataView.toSpec(false),
      fieldName: FIELD_NAME,
      originatingApp: ORIGINATING_APP,
    });
  });
});
