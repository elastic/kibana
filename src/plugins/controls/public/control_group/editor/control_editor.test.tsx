/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { OptionsListEmbeddableFactory } from '../..';
import {
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '../../../common';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '../../../common/control_group/control_group_constants';
import {
  mockControlGroupContainer,
  mockOptionsListEmbeddable,
  mockRangeSliderEmbeddable,
} from '../../../common/mocks';
import { RangeSliderEmbeddableFactory } from '../../range_slider';
import { pluginServices } from '../../services';
import { ControlGroupContainerContext } from '../embeddable/control_group_container';
import { ControlGroupInput } from '../types';
import { ControlEditor, EditControlProps } from './control_editor';

describe('Data control editor', () => {
  interface MountOptions {
    componentOptions?: Partial<EditControlProps>;
    explicitInput?: Partial<ControlGroupInput>;
  }

  pluginServices.getServices().dataViews.get = jest.fn().mockResolvedValue(stubDataView);
  pluginServices.getServices().dataViews.getIdsWithTitle = jest
    .fn()
    .mockResolvedValue([{ id: stubDataView.id, title: stubDataView.getIndexPattern() }]);
  pluginServices.getServices().controls.getControlTypes = jest
    .fn()
    .mockReturnValue([OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL]);
  pluginServices.getServices().controls.getControlFactory = jest
    .fn()
    .mockImplementation((type: string) => {
      if (type === OPTIONS_LIST_CONTROL) return new OptionsListEmbeddableFactory();
      if (type === RANGE_SLIDER_CONTROL) return new RangeSliderEmbeddableFactory();
    });

  let controlEditor: ReactWrapper = new ReactWrapper(<></>);

  async function mountComponent(options?: MountOptions) {
    const controlGroupContainer = await mockControlGroupContainer(options?.explicitInput);

    await act(async () => {
      controlEditor = mountWithIntl(
        <ControlGroupContainerContext.Provider value={controlGroupContainer}>
          <ControlEditor
            setLastUsedDataViewId={jest.fn()}
            getRelevantDataViewId={() => stubDataView.id}
            isCreate={true}
            width={DEFAULT_CONTROL_WIDTH}
            grow={DEFAULT_CONTROL_GROW}
            onSave={jest.fn()}
            onCancel={jest.fn()}
            {...options?.componentOptions}
          />
        </ControlGroupContainerContext.Provider>
      );
    });
    await new Promise(process.nextTick);
    controlEditor.update();
  }

  const selectField = async (fieldName: string) => {
    const option = findTestSubject(controlEditor, `field-picker-select-${fieldName}`);
    await act(async () => {
      option.simulate('click');
    });
    controlEditor.update();
  };

  describe('creating a new control', () => {
    test('does not show non-aggregatable field', async () => {
      await mountComponent();
      const nonAggOption = findTestSubject(controlEditor, 'field-picker-select-machine.os');
      expect(nonAggOption.exists()).toBe(false);
    });

    describe('selecting a keyword field', () => {
      beforeEach(async () => {
        await mountComponent();
        await selectField('machine.os.raw');
      });

      test('can only create an options list control', async () => {
        expect(
          findTestSubject(controlEditor, 'create__optionsListControl').instance()
        ).toBeEnabled();
        expect(
          findTestSubject(controlEditor, 'create__rangeSliderControl').instance()
        ).not.toBeEnabled();
      });

      test('has custom settings', async () => {
        const searchOptions = findTestSubject(controlEditor, 'control-editor-custom-settings');
        expect(searchOptions.exists()).toBe(true);
      });

      test('has custom search options', async () => {
        const searchOptions = findTestSubject(
          controlEditor,
          'optionsListControl__searchOptionsRadioGroup'
        );
        expect(searchOptions.exists()).toBe(true);
        const options = searchOptions.find('div.euiRadioGroup__item');
        expect(options.length).toBe(3);
      });
    });

    describe('selecting an IP field', () => {
      beforeEach(async () => {
        await mountComponent();
        await selectField('clientip');
      });

      test('can only create an options list control', async () => {
        expect(
          findTestSubject(controlEditor, 'create__optionsListControl').instance()
        ).toBeEnabled();
        expect(
          findTestSubject(controlEditor, 'create__rangeSliderControl').instance()
        ).not.toBeEnabled();
      });

      test('has custom search options', async () => {
        const searchOptions = findTestSubject(
          controlEditor,
          'optionsListControl__searchOptionsRadioGroup'
        );
        expect(searchOptions.exists()).toBe(true);
        const options = searchOptions.find('div.euiRadioGroup__item');
        expect(options.length).toBe(2);
      });
    });

    describe('selecting a number field', () => {
      beforeEach(async () => {
        await mountComponent();
        await selectField('bytes');
      });

      test('can create an options list or range slider control', async () => {
        expect(
          findTestSubject(controlEditor, 'create__optionsListControl').instance()
        ).toBeEnabled();
        expect(
          findTestSubject(controlEditor, 'create__rangeSliderControl').instance()
        ).toBeEnabled();
      });

      test('defaults to options list creation', async () => {
        expect(
          findTestSubject(controlEditor, 'create__optionsListControl').prop('aria-pressed')
        ).toBe(true);
      });

      test('when creating options list, has custom settings', async () => {
        findTestSubject(controlEditor, 'create__optionsListControl').simulate('click');
        const customSettings = findTestSubject(controlEditor, 'control-editor-custom-settings');
        expect(customSettings.exists()).toBe(true);
      });

      test('when creating options list, does not have custom search options', async () => {
        findTestSubject(controlEditor, 'create__optionsListControl').simulate('click');
        const searchOptions = findTestSubject(
          controlEditor,
          'optionsListControl__searchOptionsRadioGroup'
        );
        expect(searchOptions.exists()).toBe(false);
      });

      test('when creating range slider, does have custom settings', async () => {
        findTestSubject(controlEditor, 'create__rangeSliderControl').simulate('click');
        const searchOptions = findTestSubject(controlEditor, 'control-editor-custom-settings');
        expect(searchOptions.exists()).toBe(true);
      });

      test('when creating range slider, validates step setting is greater than 0', async () => {
        findTestSubject(controlEditor, 'create__rangeSliderControl').simulate('click');
        const stepOption = findTestSubject(
          controlEditor,
          'rangeSliderControl__stepAdditionalSetting'
        );
        expect(stepOption.exists()).toBe(true);

        const saveButton = findTestSubject(controlEditor, 'control-editor-save');
        expect(saveButton.instance()).toBeEnabled();

        stepOption.simulate('change', { target: { valueAsNumber: undefined } });
        expect(saveButton.instance()).toBeDisabled();

        stepOption.simulate('change', { target: { valueAsNumber: 0.5 } });
        expect(saveButton.instance()).toBeEnabled();

        stepOption.simulate('change', { target: { valueAsNumber: 0 } });
        expect(saveButton.instance()).toBeDisabled();

        stepOption.simulate('change', { target: { valueAsNumber: 1 } });
        expect(saveButton.instance()).toBeEnabled();
      });
    });

    test('selects given width and grow', async () => {
      await mountComponent({ componentOptions: { grow: false, width: 'small' } });
      const selectedClass = 'euiButtonGroupButton-isSelected';
      expect(
        findTestSubject(controlEditor, 'control-editor-width-medium').hasClass(selectedClass)
      ).toBe(false);
      expect(
        findTestSubject(controlEditor, 'control-editor-width-small').hasClass(selectedClass)
      ).toBe(true);
      expect(
        findTestSubject(controlEditor, 'control-editor-width-large').hasClass(selectedClass)
      ).toBe(false);
      expect(
        findTestSubject(controlEditor, 'control-editor-grow-switch').prop('aria-checked')
      ).toBe(false);
    });
  });

  describe('editing existing options list control', () => {
    const openEditor = async (
      type: string,
      explicitInput?: Partial<OptionsListEmbeddableInput>
    ) => {
      const control =
        type === 'optionsList'
          ? await mockOptionsListEmbeddable({
              explicitInput: {
                title: 'machine.os.raw',
                dataViewId: stubDataView.id,
                fieldName: 'machine.os.raw',
                ...explicitInput,
              },
            })
          : await mockRangeSliderEmbeddable({
              explicitInput: {
                title: 'bytes',
                dataViewId: stubDataView.id,
                fieldName: 'bytes',
                ...explicitInput,
              },
            });
      await mountComponent({
        componentOptions: { isCreate: false, embeddable: control },
      });
    };

    describe('control title', () => {
      test('auto-fills default', async () => {
        await openEditor('optionsList');
        const titleInput = findTestSubject(controlEditor, 'control-editor-title-input');
        expect(titleInput.prop('value')).toBe('machine.os.raw');
        expect(titleInput.prop('placeholder')).toBe('machine.os.raw');
      });

      test('auto-fills custom title', async () => {
        await openEditor('optionsList', { title: 'Custom Title' });
        const titleInput = findTestSubject(controlEditor, 'control-editor-title-input');
        expect(titleInput.prop('value')).toBe('Custom Title');
        expect(titleInput.prop('placeholder')).toBe('machine.os.raw');
      });
    });

    describe('control type', () => {
      test('selects the default control type', async () => {
        await openEditor('optionsList', { fieldName: 'bytes' });
        expect(
          findTestSubject(controlEditor, 'create__optionsListControl').prop('aria-pressed')
        ).toBe(true);
        expect(
          findTestSubject(controlEditor, 'create__rangeSliderControl').prop('aria-pressed')
        ).toBe(false);
      });

      test('selects the given, non-default control type', async () => {
        await openEditor('rangeSlider', { fieldName: 'bytes' });
        expect(
          findTestSubject(controlEditor, 'create__optionsListControl').prop('aria-pressed')
        ).toBe(false);
        expect(
          findTestSubject(controlEditor, 'create__rangeSliderControl').prop('aria-pressed')
        ).toBe(true);
      });
    });

    describe('selection options', () => {
      test('selects default', async () => {
        await openEditor('optionsList');
        const radioGroup = findTestSubject(
          controlEditor,
          'optionsListControl__selectionOptionsRadioGroup'
        );
        expect(radioGroup.find('input#multi').prop('checked')).toBe(true);
        expect(radioGroup.find('input#single').prop('checked')).toBe(false);
      });

      test('selects given', async () => {
        await openEditor('optionsList', { singleSelect: true });
        const radioGroup = findTestSubject(
          controlEditor,
          'optionsListControl__selectionOptionsRadioGroup'
        );
        expect(radioGroup.find('input#multi').prop('checked')).toBe(false);
        expect(radioGroup.find('input#single').prop('checked')).toBe(true);
      });
    });

    describe('search techniques', () => {
      test('selects default', async () => {
        await openEditor('optionsList');
        const radioGroup = findTestSubject(
          controlEditor,
          'optionsListControl__searchOptionsRadioGroup'
        );
        expect(radioGroup.find('input#prefix').prop('checked')).toBe(true);
        expect(radioGroup.find('input#wildcard').prop('checked')).toBe(false);
      });

      test('selects given', async () => {
        await openEditor('optionsList', { searchTechnique: 'wildcard' });
        const radioGroup = findTestSubject(
          controlEditor,
          'optionsListControl__searchOptionsRadioGroup'
        );
        expect(radioGroup.find('input#prefix').prop('checked')).toBe(false);
        expect(radioGroup.find('input#wildcard').prop('checked')).toBe(true);
      });
    });
  });
});
