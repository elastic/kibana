/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';

import { ControlGroupInput } from '../types';
import { pluginServices } from '../../services';
import { ControlEditor, EditControlProps } from './control_editor';
import { OptionsListEmbeddableFactory } from '../..';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '../../../common/control_group/control_group_constants';
import { mockControlGroupContainer, mockOptionsListEmbeddable } from '../../../common/mocks';
import { RangeSliderEmbeddableFactory } from '../../range_slider';
import { ControlGroupContainerContext } from '../embeddable/control_group_container';
import {
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '../../../common';

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

      test('creates an options list control', async () => {
        expect(findTestSubject(controlEditor, 'control-editor-type').text()).toEqual(
          'Options list'
        );
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
      });
    });

    describe('selecting an IP field', () => {
      beforeEach(async () => {
        await mountComponent();
        await selectField('clientip');
      });

      test('creates an options list control', async () => {
        expect(findTestSubject(controlEditor, 'control-editor-type').text()).toEqual(
          'Options list'
        );
      });

      test('does not have custom search options', async () => {
        const searchOptions = findTestSubject(
          controlEditor,
          'optionsListControl__searchOptionsRadioGroup'
        );
        expect(searchOptions.exists()).toBe(false);
      });
    });

    describe('selecting a number field', () => {
      beforeEach(async () => {
        await mountComponent();
        await selectField('bytes');
      });

      test('creates a range slider control', async () => {
        expect(findTestSubject(controlEditor, 'control-editor-type').text()).toEqual(
          'Range slider'
        );
      });

      test('does not have any custom settings', async () => {
        const searchOptions = findTestSubject(controlEditor, 'control-editor-custom-settings');
        expect(searchOptions.exists()).toBe(false);
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
    const openOptionsListEditor = async (explicitInput?: Partial<OptionsListEmbeddableInput>) => {
      const control = await mockOptionsListEmbeddable({
        explicitInput: {
          title: 'machine.os.raw',
          dataViewId: stubDataView.id,
          fieldName: 'machine.os.raw',
          ...explicitInput,
        },
      });
      await mountComponent({
        componentOptions: { isCreate: false, embeddable: control },
      });
    };

    describe('control title', () => {
      test('auto-fills default', async () => {
        await openOptionsListEditor();
        const titleInput = findTestSubject(controlEditor, 'control-editor-title-input');
        expect(titleInput.prop('value')).toBe('machine.os.raw');
        expect(titleInput.prop('placeholder')).toBe('machine.os.raw');
      });

      test('auto-fills custom title', async () => {
        await openOptionsListEditor({ title: 'Custom Title' });
        const titleInput = findTestSubject(controlEditor, 'control-editor-title-input');
        expect(titleInput.prop('value')).toBe('Custom Title');
        expect(titleInput.prop('placeholder')).toBe('machine.os.raw');
      });
    });

    describe('selection options', () => {
      test('selects default', async () => {
        await openOptionsListEditor();
        const radioGroup = findTestSubject(
          controlEditor,
          'optionsListControl__selectionOptionsRadioGroup'
        );
        expect(radioGroup.find('input#multi').prop('checked')).toBe(true);
        expect(radioGroup.find('input#single').prop('checked')).toBe(false);
      });

      test('selects given', async () => {
        await openOptionsListEditor({ singleSelect: true });
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
        await openOptionsListEditor();
        const radioGroup = findTestSubject(
          controlEditor,
          'optionsListControl__searchOptionsRadioGroup'
        );
        expect(radioGroup.find('input#prefix').prop('checked')).toBe(true);
        expect(radioGroup.find('input#wildcard').prop('checked')).toBe(false);
      });

      test('selects given', async () => {
        await openOptionsListEditor({ searchTechnique: 'wildcard' });
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
