/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { stubFieldSpecMap } from '@kbn/data-views-plugin/common/field.stub';
import { TimeRange } from '@kbn/es-query';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, RenderResult, waitFor } from '@testing-library/react';

import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
  type DefaultDataControlState,
} from '../../../common';
import { dataViewsService } from '../../services/kibana_services';
import { getAllControlTypes, getControlFactory } from '../../control_factory_registry';
import type { ControlGroupApi } from '../../control_group/types';
import type { ControlFactory } from '../types';
import { DataControlEditor } from './data_control_editor';
import {
  getMockedOptionsListControlFactory,
  getMockedRangeSliderControlFactory,
  getMockedSearchControlFactory,
} from './mocks/factory_mocks';
import type { DataControlApi, DataControlFactory } from './types';

jest.mock('../../control_factory_registry', () => ({
  ...jest.requireActual('../../control_factory_registry'),
  getAllControlTypes: jest.fn(),
  getControlFactory: jest.fn(),
}));

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

const dashboardApi = {
  timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
};
const controlGroupApi = {
  parentApi: dashboardApi,
  grow: new BehaviorSubject(DEFAULT_CONTROL_GROW),
  width: new BehaviorSubject(DEFAULT_CONTROL_WIDTH),
  getEditorConfig: () => undefined,
} as unknown as ControlGroupApi;

describe('Data control editor', () => {
  const mountComponent = async ({
    initialState,
    controlId,
    controlType,
    initialDefaultPanelTitle,
  }: {
    initialState?: Partial<DefaultDataControlState>;
    controlId?: string;
    controlType?: string;
    initialDefaultPanelTitle?: string;
  }) => {
    dataViewsService.get = jest.fn().mockResolvedValue(mockDataView);

    const controlEditor = render(
      <I18nProvider>
        <DataControlEditor
          onCancel={() => {}}
          onSave={() => {}}
          controlGroupApi={controlGroupApi}
          initialState={{
            dataViewId: mockDataView.id,
            ...initialState,
          }}
          controlId={controlId}
          controlType={controlType}
          initialDefaultPanelTitle={initialDefaultPanelTitle}
        />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(dataViewsService.get).toHaveBeenCalledTimes(1);
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

  const mockRegistry: { [key: string]: ControlFactory<DefaultDataControlState, DataControlApi> } = {
    search: getMockedSearchControlFactory({ parentApi: controlGroupApi }),
    optionsList: getMockedOptionsListControlFactory({ parentApi: controlGroupApi }),
    rangeSlider: getMockedRangeSliderControlFactory({ parentApi: controlGroupApi }),
  };

  beforeAll(() => {
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

    test('CompatibleControlTypesComponent respects ordering', async () => {
      const tempRegistry: {
        [key: string]: ControlFactory<DefaultDataControlState, DataControlApi>;
      } = {
        ...mockRegistry,
        alphabeticalFirstControl: {
          type: 'alphabeticalFirst',
          getIconType: () => 'lettering',
          getDisplayName: () => 'Alphabetically first',
          isFieldCompatible: () => true,
          buildControl: jest.fn().mockReturnValue({
            api: controlGroupApi,
            Component: <>Should be first alphabetically</>,
          }),
        } as DataControlFactory,
        supremeControl: {
          type: 'supremeControl',
          order: 100, // force it first despite alphabetical ordering
          getIconType: () => 'starFilled',
          getDisplayName: () => 'Supreme leader',
          isFieldCompatible: () => true,
          buildControl: jest.fn().mockReturnValue({
            api: controlGroupApi,
            Component: <>This control is forced first via the factory order</>,
          }),
        } as DataControlFactory,
      };
      (getAllControlTypes as jest.Mock).mockReturnValue(Object.keys(tempRegistry));
      (getControlFactory as jest.Mock).mockImplementation((key) => tempRegistry[key]);

      const controlEditor = await mountComponent({});
      const menu = controlEditor.getByTestId('controlTypeMenu');
      expect(menu.children.length).toEqual(5);
      expect(menu.children[0].textContent).toEqual('Supreme leader'); // forced first - ignore alphabetical sorting
      // the rest should be alphabetically sorted
      expect(menu.children[1].textContent).toEqual('Alphabetically first');
      expect(menu.children[2].textContent).toEqual('Options list');
      expect(menu.children[3].textContent).toEqual('Range slider');
      expect(menu.children[4].textContent).toEqual('Search');

      (getAllControlTypes as jest.Mock).mockReturnValue(Object.keys(mockRegistry));
      (getControlFactory as jest.Mock).mockImplementation((key) => mockRegistry[key]);
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
            fieldName: 'machine.os.raw',
          },
          controlType: 'optionsList',
          controlId: 'testId',
          initialDefaultPanelTitle: 'OS',
        });
        const titleInput = await controlEditor.findByTestId('control-editor-title-input');
        expect(titleInput.getAttribute('value')).toBe('OS');
        expect(titleInput.getAttribute('placeholder')).toBe('OS');
      });

      test('auto-fills input with the custom title', async () => {
        const controlEditor = await mountComponent({
          initialState: {
            fieldName: 'machine.os.raw',
            title: 'Custom title',
          },
          controlType: 'optionsList',
          controlId: 'testId',
        });
        const titleInput = await controlEditor.findByTestId('control-editor-title-input');
        expect(titleInput.getAttribute('value')).toBe('Custom title');
        expect(titleInput.getAttribute('placeholder')).toBe('machine.os.raw');
      });
    });

    test('selects the provided control type', async () => {
      const controlEditor = await mountComponent({
        initialState: {
          fieldName: 'bytes',
        },
        controlType: 'rangeSlider',
        controlId: 'testId',
      });

      expect(controlEditor.getByTestId('create__optionsList')).toBeEnabled();
      expect(controlEditor.getByTestId('create__rangeSlider')).toBeEnabled();
      expect(controlEditor.getByTestId('create__search')).not.toBeEnabled();

      expect(getPressedAttribute(controlEditor, 'create__optionsList')).toBe('false');
      expect(getPressedAttribute(controlEditor, 'create__rangeSlider')).toBe('true');
      expect(getPressedAttribute(controlEditor, 'create__search')).toBe('false');
    });
  });

  describe('control editor config', () => {
    const getEditorConfig = jest.fn().mockImplementation(() => undefined);

    beforeAll(() => {
      controlGroupApi.getEditorConfig = getEditorConfig;
    });

    test('all elements are visible when no editor config', async () => {
      const controlEditor = await mountComponent({
        initialState: {
          fieldName: 'machine.os.raw',
        },
        controlType: 'optionsList',
        controlId: 'testId',
        initialDefaultPanelTitle: 'OS',
      });

      const dataViewPicker = controlEditor.queryByTestId('control-editor-data-view-picker');
      expect(dataViewPicker).toBeInTheDocument();
      const widthSettings = controlEditor.queryByTestId('control-editor-width-settings');
      expect(widthSettings).toBeInTheDocument();
      const customSettings = controlEditor.queryByTestId('control-editor-custom-settings');
      expect(customSettings).toBeInTheDocument();
    });

    test('can hide elements with the editor config', async () => {
      getEditorConfig.mockImplementationOnce(() => ({
        hideDataViewSelector: true,
        hideWidthSettings: true,
        hideAdditionalSettings: true,
      }));

      const controlEditor = await mountComponent({
        initialState: {
          fieldName: 'machine.os.raw',
        },
        controlType: 'optionsList',
        controlId: 'testId',
        initialDefaultPanelTitle: 'OS',
      });

      const dataViewPicker = controlEditor.queryByTestId('control-editor-data-view-picker');
      expect(dataViewPicker).not.toBeInTheDocument();
      const widthSettings = controlEditor.queryByTestId('control-editor-width-settings');
      expect(widthSettings).not.toBeInTheDocument();
      const customSettings = controlEditor.queryByTestId('control-editor-custom-settings');
      expect(customSettings).not.toBeInTheDocument();
    });
  });
});
