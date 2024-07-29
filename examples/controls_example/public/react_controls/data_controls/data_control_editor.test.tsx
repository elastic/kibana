/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { stubFieldSpecMap } from '@kbn/data-views-plugin/common/field.stub';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { TimeRange } from '@kbn/es-query';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, RenderResult, waitFor } from '@testing-library/react';

import { getAllControlTypes, getControlFactory } from '../control_factory_registry';
jest.mock('../control_factory_registry', () => ({
  ...jest.requireActual('../control_factory_registry'),
  getAllControlTypes: jest.fn(),
  getControlFactory: jest.fn(),
}));
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
import { ControlGroupApi } from '../control_group/types';
import { DataControlEditor } from './data_control_editor';
import { DataControlEditorState } from './open_data_control_editor';
import {
  getMockedOptionsListControlFactory,
  getMockedRangeSliderControlFactory,
  getMockedSearchControlFactory,
} from './mocks/data_control_mocks';
import { ControlFactory } from '../types';
import { DataControlApi, DefaultDataControlState } from './types';

const mockDataViews = dataViewPluginMocks.createStartContract();
const mockDataView = createStubDataView({
  spec: {
    id: 'logstash-*',
    fields: {
      ...stubFieldSpecMap,
      'machine.os.raw': {
        name: 'machine.os.raw',
        customLabel: 'OS',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
      },
    },
    title: 'logstash-*',
    timeFieldName: '@timestamp',
  },
});
mockDataViews.get = jest.fn().mockResolvedValue(mockDataView);

const dashboardApi = {
  timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  lastUsedDataViewId$: new BehaviorSubject<string>(mockDataView.id!),
};
const controlGroupApi = {
  parentApi: dashboardApi,
  grow: new BehaviorSubject(DEFAULT_CONTROL_GROW),
  width: new BehaviorSubject(DEFAULT_CONTROL_WIDTH),
} as unknown as ControlGroupApi;

describe('Data control editor', () => {
  const mountComponent = async ({
    initialState,
  }: {
    initialState?: Partial<DataControlEditorState>;
  }) => {
    mockDataViews.get = jest.fn().mockResolvedValue(mockDataView);

    const controlEditor = render(
      <I18nProvider>
        <DataControlEditor
          onCancel={() => {}}
          onSave={() => {}}
          parentApi={controlGroupApi}
          initialState={{
            dataViewId: dashboardApi.lastUsedDataViewId$.getValue(),
            ...initialState,
          }}
          services={{ dataViews: mockDataViews }}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(mockDataViews.get).toHaveBeenCalledTimes(1);
    });

    return controlEditor;
  };

  const selectField = async (controlEditor: RenderResult, fieldName: string) => {
    expect(controlEditor.queryByTestId(`field-picker-select-${fieldName}`)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(controlEditor.getByTestId(`field-picker-select-${fieldName}`));
    });
  };

  const getPressedAttribute = (controlEditor: RenderResult, testId: string) => {
    return controlEditor.getByTestId(testId).getAttribute('aria-pressed');
  };

  beforeAll(() => {
    const mockRegistry: { [key: string]: ControlFactory<DefaultDataControlState, DataControlApi> } =
      {
        search: getMockedSearchControlFactory({ parentApi: controlGroupApi }),
        optionsList: getMockedOptionsListControlFactory({ parentApi: controlGroupApi }),
        rangeSlider: getMockedRangeSliderControlFactory({ parentApi: controlGroupApi }),
      };
    (getAllControlTypes as jest.Mock).mockReturnValue(Object.keys(mockRegistry));
    (getControlFactory as jest.Mock).mockImplementation((key) => mockRegistry[key]);
  });

  describe('creating a new control', () => {
    test('field list does not include fields that are not compatible with any control types', async () => {
      const controlEditor = await mountComponent({});
      const nonAggOption = controlEditor.queryByTestId('field-picker-select-machine.os');
      expect(nonAggOption).not.toBeInTheDocument();
    });

    test('cannot save before selecting a field', async () => {
      const controlEditor = await mountComponent({});

      const saveButton = controlEditor.getByTestId('control-editor-save');
      expect(saveButton).toBeDisabled();
      await selectField(controlEditor, 'machine.os.raw');
      expect(saveButton).toBeEnabled();
    });

    test('selecting a keyword field - can only create an options list control', async () => {
      const controlEditor = await mountComponent({});
      await selectField(controlEditor, 'machine.os.raw');

      expect(controlEditor.getByTestId('create__optionsList')).toBeEnabled();
      expect(controlEditor.getByTestId('create__rangeSlider')).not.toBeEnabled();
      expect(controlEditor.getByTestId('create__search')).not.toBeEnabled();
    });

    test('selecting an IP field - can only create an options list control', async () => {
      const controlEditor = await mountComponent({});
      await selectField(controlEditor, 'clientip');

      expect(controlEditor.getByTestId('create__optionsList')).toBeEnabled();
      expect(controlEditor.getByTestId('create__rangeSlider')).not.toBeEnabled();
      expect(controlEditor.getByTestId('create__search')).not.toBeEnabled();
    });

    describe('selecting a number field', () => {
      let controlEditor: RenderResult;

      beforeEach(async () => {
        controlEditor = await mountComponent({});
        await selectField(controlEditor, 'bytes');
      });

      test('can create an options list or range slider control', () => {
        expect(controlEditor.getByTestId('create__optionsList')).toBeEnabled();
        expect(controlEditor.getByTestId('create__rangeSlider')).toBeEnabled();
        expect(controlEditor.getByTestId('create__search')).not.toBeEnabled();
      });

      test('defaults to options list creation', () => {
        expect(getPressedAttribute(controlEditor, 'create__optionsList')).toBe('true');
        expect(getPressedAttribute(controlEditor, 'create__rangeSlider')).toBe('false');
      });
    });

    test('renders custom settings when provided', async () => {
      const controlEditor = await mountComponent({});
      await selectField(controlEditor, 'machine.os.raw');
      expect(controlEditor.queryByTestId('optionsListCustomSettings')).toBeInTheDocument();
    });
  });

  test('selects the default width and grow', async () => {
    const controlEditor = await mountComponent({});

    expect(getPressedAttribute(controlEditor, 'control-editor-width-small')).toBe('false');
    expect(getPressedAttribute(controlEditor, 'control-editor-width-medium')).toBe('true');
    expect(getPressedAttribute(controlEditor, 'control-editor-width-large')).toBe('false');
    expect(
      controlEditor.getByTestId('control-editor-grow-switch').getAttribute('aria-checked')
    ).toBe(`${DEFAULT_CONTROL_GROW}`);
  });

  describe('editing existing control', () => {
    describe('control title', () => {
      test('auto-fills input with the default title', async () => {
        const controlEditor = await mountComponent({
          initialState: {
            controlType: 'optionsList',
            controlId: 'testId',
            fieldName: 'machine.os.raw',
            defaultPanelTitle: 'OS',
          },
        });
        const titleInput = await controlEditor.findByTestId('control-editor-title-input');
        expect(titleInput.getAttribute('value')).toBe('OS');
        expect(titleInput.getAttribute('placeholder')).toBe('OS');
      });

      test('auto-fills input with the custom title', async () => {
        const controlEditor = await mountComponent({
          initialState: {
            controlType: 'optionsList',
            controlId: 'testId',
            fieldName: 'machine.os.raw',
            title: 'Custom title',
          },
        });
        const titleInput = await controlEditor.findByTestId('control-editor-title-input');
        expect(titleInput.getAttribute('value')).toBe('Custom title');
        expect(titleInput.getAttribute('placeholder')).toBe('machine.os.raw');
      });
    });

    test('selects the provided control type', async () => {
      const controlEditor = await mountComponent({
        initialState: {
          controlType: 'rangeSlider',
          controlId: 'testId',
          fieldName: 'bytes',
        },
      });

      expect(controlEditor.getByTestId('create__optionsList')).toBeEnabled();
      expect(controlEditor.getByTestId('create__rangeSlider')).toBeEnabled();
      expect(controlEditor.getByTestId('create__search')).not.toBeEnabled();

      expect(getPressedAttribute(controlEditor, 'create__optionsList')).toBe('false');
      expect(getPressedAttribute(controlEditor, 'create__rangeSlider')).toBe('true');
      expect(getPressedAttribute(controlEditor, 'create__search')).toBe('false');
    });
  });
});
