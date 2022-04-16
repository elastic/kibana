/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { shallowWithI18nProvider, mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { mount, ReactWrapper } from 'enzyme';
import { FieldSetting } from '../../types';
import { UiSettingsType } from '@kbn/core/public';
import { notificationServiceMock, docLinksServiceMock } from '@kbn/core/public/mocks';

import { findTestSubject } from '@elastic/eui/lib/test';
import { Field, getEditableValue } from './field';

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn(),
}));

const defaults = {
  requiresPageReload: false,
  readOnly: false,
  category: ['category'],
};

const exampleValues = {
  array: ['example_value'],
  boolean: false,
  color: '#FF00CC',
  image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=',
  json: { foo: 'bar2' },
  markdown: 'Hello World',
  number: 1,
  select: 'banana',
  string: 'hello world',
  stringWithValidation: 'foo',
};

const settings: Record<string, FieldSetting> = {
  array: {
    name: 'array:test:setting',
    ariaName: 'array test setting',
    displayName: 'Array test setting',
    description: 'Description for Array test setting',
    type: 'array',
    value: undefined,
    defVal: ['default_value'],
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  boolean: {
    name: 'boolean:test:setting',
    ariaName: 'boolean test setting',
    displayName: 'Boolean test setting',
    description: 'Description for Boolean test setting',
    type: 'boolean',
    value: undefined,
    defVal: true,
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  image: {
    name: 'image:test:setting',
    ariaName: 'image test setting',
    displayName: 'Image test setting',
    description: 'Description for Image test setting',
    type: 'image',
    value: undefined,
    defVal: null,
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  json: {
    name: 'json:test:setting',
    ariaName: 'json test setting',
    displayName: 'Json test setting',
    description: 'Description for Json test setting',
    type: 'json',
    value: '{"foo": "bar"}',
    defVal: '{}',
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  markdown: {
    name: 'markdown:test:setting',
    ariaName: 'markdown test setting',
    displayName: 'Markdown test setting',
    description: 'Description for Markdown test setting',
    type: 'markdown',
    value: undefined,
    defVal: '',
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  number: {
    name: 'number:test:setting',
    ariaName: 'number test setting',
    displayName: 'Number test setting',
    description: 'Description for Number test setting',
    type: 'number',
    value: undefined,
    defVal: 5,
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  select: {
    name: 'select:test:setting',
    ariaName: 'select test setting',
    displayName: 'Select test setting',
    description: 'Description for Select test setting',
    type: 'select',
    value: undefined,
    defVal: 'orange',
    isCustom: false,
    isOverridden: false,
    options: ['apple', 'orange', 'banana'],
    optionLabels: {
      apple: 'Apple',
      orange: 'Orange',
      // Deliberately left out `banana` to test if it also works with missing labels
    },
    ...defaults,
  },
  string: {
    name: 'string:test:setting',
    ariaName: 'string test setting',
    displayName: 'String test setting',
    description: 'Description for String test setting',
    type: 'string',
    value: undefined,
    defVal: null,
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  stringWithValidation: {
    name: 'string:test-validation:setting',
    ariaName: 'string test validation setting',
    displayName: 'String test validation setting',
    description: 'Description for String test validation setting',
    type: 'string',
    value: undefined,
    defVal: 'foo-default',
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
  color: {
    name: 'color:test:setting',
    ariaName: 'color test setting',
    displayName: 'Color test setting',
    description: 'Description for Color test setting',
    type: 'color',
    value: undefined,
    defVal: null,
    isCustom: false,
    isOverridden: false,
    ...defaults,
  },
};
const userValues = {
  array: ['user', 'value'],
  boolean: false,
  image: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  json: '{"hello": "world"}',
  markdown: '**bold**',
  number: 10,
  select: 'banana',
  string: 'foo',
  stringWithValidation: 'fooUserValue',
  color: '#FACF0C',
};

const handleChange = jest.fn();
const clearChange = jest.fn();

const getFieldSettingValue = (wrapper: ReactWrapper, name: string, type: string) => {
  const field = findTestSubject(wrapper, `advancedSetting-editField-${name}`);
  if (type === 'boolean') {
    return field.props()['aria-checked'];
  } else if (type === 'color') {
    return field.props().color;
  } else {
    return field.props().value;
  }
};

describe('Field', () => {
  Object.keys(settings).forEach((type) => {
    const setting = settings[type];

    describe(`for ${type} setting`, () => {
      it('should render default value if there is no user value set', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={setting}
            handleChange={handleChange}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
          />
        );

        expect(component).toMatchSnapshot();
      });

      it('should render as read only with help text if overridden', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={{
              ...setting,
              // @ts-ignore
              value: userValues[type],
              isOverridden: true,
            }}
            handleChange={handleChange}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
          />
        );

        expect(component).toMatchSnapshot();
      });

      it('should render as read only if saving is disabled', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={setting}
            handleChange={handleChange}
            enableSaving={false}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
          />
        );
        expect(component).toMatchSnapshot();
      });

      it('should render user value if there is user value is set', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={{
              ...setting,
              // @ts-ignore
              value: userValues[type],
            }}
            handleChange={handleChange}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
          />
        );

        expect(component).toMatchSnapshot();
      });

      it('should render custom setting icon if it is custom', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={{
              ...setting,
              isCustom: true,
            }}
            handleChange={handleChange}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
          />
        );
        expect(component).toMatchSnapshot();
      });
      it('should render unsaved value if there are unsaved changes', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={{
              ...setting,
              isCustom: true,
            }}
            handleChange={handleChange}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
            unsavedChanges={{
              // @ts-ignore
              value: exampleValues[setting.type],
            }}
          />
        );
        expect(component).toMatchSnapshot();
      });
    });

    if (type === 'select') {
      it('should use options for rendering values and optionsLabels for rendering labels', () => {
        const component = mountWithI18nProvider(
          <Field
            setting={{
              ...setting,
              isCustom: true,
            }}
            handleChange={handleChange}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
          />
        );
        const select = findTestSubject(component, `advancedSetting-editField-${setting.name}`);
        // @ts-ignore
        const values = select.find('option').map((option) => option.prop('value'));
        expect(values).toEqual(['apple', 'orange', 'banana']);
        // @ts-ignore
        const labels = select.find('option').map((option) => option.text());
        expect(labels).toEqual(['Apple', 'Orange', 'banana']);
      });
    }

    const setup = () => {
      const Wrapper = (props: Record<string, any>) => (
        <I18nProvider>
          <Field
            setting={setting}
            clearChange={clearChange}
            handleChange={handleChange}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            docLinks={docLinksServiceMock.createStartContract().links}
            {...props}
          />
        </I18nProvider>
      );
      const wrapper = mount(<Wrapper />);
      const component = wrapper.find(I18nProvider).find(Field);

      return {
        wrapper,
        component,
      };
    };

    if (type === 'image') {
      describe(`for changing ${type} setting`, () => {
        const { wrapper, component } = setup();
        const userValue = userValues[type];
        (component.instance() as Field).getImageAsBase64 = ({}: Blob) => Promise.resolve('');

        it('should be able to change value and cancel', async () => {
          (component.instance() as Field).onImageChange([userValue] as unknown as FileList);
          expect(handleChange).toBeCalled();
          await wrapper.setProps({
            unsavedChanges: {
              value: userValue,
              changeImage: true,
            },
            setting: {
              ...(component.instance() as Field).props.setting,
              value: userValue,
            },
          });
          await (component.instance() as Field).cancelChangeImage();
          expect(clearChange).toBeCalledWith(setting.name);
          wrapper.update();
        });

        it('should be able to change value from existing value', async () => {
          await wrapper.setProps({
            unsavedChanges: {},
          });
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-changeImage-${setting.name}`).simulate('click');
          const newUserValue = `${userValue}=`;
          await (component.instance() as Field).onImageChange([
            newUserValue,
          ] as unknown as FileList);
          expect(handleChange).toBeCalled();
        });

        it('should be able to reset to default value', async () => {
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-resetField-${setting.name}`).simulate('click');
          expect(handleChange).toBeCalledWith(setting.name, {
            value: getEditableValue(setting.type, setting.defVal),
            changeImage: true,
          });
        });
      });
    } else if (type === 'markdown' || type === 'json') {
      describe(`for changing ${type} setting`, () => {
        const { wrapper, component } = setup();
        const userValue = userValues[type];

        it('should be able to change value', async () => {
          (component.instance() as Field).onCodeEditorChange(userValue as UiSettingsType);
          expect(handleChange).toBeCalledWith(setting.name, { value: userValue });
          await wrapper.setProps({
            setting: {
              ...(component.instance() as Field).props.setting,
              value: userValue,
            },
          });
          wrapper.update();
        });

        it('should be able to reset to default value', async () => {
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-resetField-${setting.name}`).simulate('click');
          expect(handleChange).toBeCalledWith(setting.name, {
            value: getEditableValue(setting.type, setting.defVal),
          });
        });

        if (type === 'json') {
          it('should be able to clear value and have empty object populate', async () => {
            await (component.instance() as Field).onCodeEditorChange('' as UiSettingsType);
            wrapper.update();
            expect(handleChange).toBeCalledWith(setting.name, { value: setting.defVal });
          });
        }
      });
    } else if (type === 'color') {
      describe(`for changing ${type} setting`, () => {
        const { wrapper, component } = setup();
        const userValue = userValues[type];

        it('should be able to change value', async () => {
          await (component.instance() as Field).onFieldChange(userValue);
          const updated = wrapper.update();
          expect(handleChange).toBeCalledWith(setting.name, { value: userValue });
          updated.setProps({ unsavedChanges: { value: userValue } });
          const currentValue = wrapper.find('EuiColorPicker').prop('color');
          expect(currentValue).toEqual(userValue);
        });

        it('should be able to reset to default value', async () => {
          await wrapper.setProps({
            unsavedChanges: {},
            setting: { ...setting, value: userValue },
          });
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-resetField-${setting.name}`).simulate('click');
          const expectedEditableValue = getEditableValue(setting.type, setting.defVal);
          expect(handleChange).toBeCalledWith(setting.name, {
            value: expectedEditableValue,
          });
          updated.setProps({ unsavedChanges: { value: expectedEditableValue } });
          const currentValue = wrapper.find('EuiColorPicker').prop('color');
          expect(currentValue).toEqual(expectedEditableValue);
        });
      });
    } else {
      describe(`for changing ${type} setting`, () => {
        const { wrapper, component } = setup();
        // @ts-ignore
        const userValue = userValues[type];
        const fieldUserValue = type === 'array' ? userValue.join(', ') : userValue;

        it('should be able to change value', async () => {
          await (component.instance() as Field).onFieldChange(fieldUserValue);
          const updated = wrapper.update();
          expect(handleChange).toBeCalledWith(setting.name, { value: fieldUserValue });
          updated.setProps({ unsavedChanges: { value: fieldUserValue } });
          const currentValue = getFieldSettingValue(updated, setting.name, type);
          expect(currentValue).toEqual(fieldUserValue);
        });

        it('should be able to reset to default value', async () => {
          await wrapper.setProps({
            unsavedChanges: {},
            setting: { ...setting, value: fieldUserValue },
          });
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-resetField-${setting.name}`).simulate('click');
          const expectedEditableValue = getEditableValue(setting.type, setting.defVal);
          expect(handleChange).toBeCalledWith(setting.name, {
            value: expectedEditableValue,
          });
          updated.setProps({ unsavedChanges: { value: expectedEditableValue } });
          const currentValue = getFieldSettingValue(updated, setting.name, type);
          expect(currentValue).toEqual(expectedEditableValue);
        });
      });
    }
  });
});
