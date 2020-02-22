/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { shallowWithI18nProvider, mountWithI18nProvider } from 'test_utils/enzyme_helpers';
import { mount } from 'enzyme';
import { FieldSetting } from '../../types';
import { UiSettingsType, StringValidation } from '../../../../../../core/public';
import { notificationServiceMock, docLinksServiceMock } from '../../../../../../core/public/mocks';

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { Field } from './field';

jest.mock('ui/notify', () => ({
  toastNotifications: {
    addDanger: () => {},
    add: jest.fn(),
  },
}));

jest.mock('brace/theme/textmate', () => 'brace/theme/textmate');
jest.mock('brace/mode/markdown', () => 'brace/mode/markdown');

const defaults = {
  requiresPageReload: false,
  readOnly: false,
  category: ['category'],
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
    validation: {
      maxSize: {
        length: 1000,
        description: 'Description for 1 kB',
      },
    },
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
    validation: {
      regex: new RegExp('/^foo'),
      message: 'must start with "foo"',
    },
    value: undefined,
    defVal: 'foo-default',
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
};
const invalidUserValues = {
  stringWithValidation: 'invalidUserValue',
};
const save = jest.fn(() => Promise.resolve(true));
const clear = jest.fn(() => Promise.resolve(true));

describe('Field', () => {
  Object.keys(settings).forEach(type => {
    const setting = settings[type];

    describe(`for ${type} setting`, () => {
      it('should render default value if there is no user value set', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={setting}
            save={save}
            clear={clear}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
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
            save={save}
            clear={clear}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
          />
        );

        expect(component).toMatchSnapshot();
      });

      it('should render as read only if saving is disabled', async () => {
        const component = shallowWithI18nProvider(
          <Field
            setting={setting}
            save={save}
            clear={clear}
            enableSaving={false}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
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
            save={save}
            clear={clear}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
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
            save={save}
            clear={clear}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    if (type === 'select') {
      it('should use options for rendering values', () => {
        const component = mountWithI18nProvider(
          <Field
            setting={{
              ...setting,
              isCustom: true,
            }}
            save={save}
            clear={clear}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
          />
        );
        const select = findTestSubject(component, `advancedSetting-editField-${setting.name}`);
        // @ts-ignore
        const labels = select.find('option').map(option => option.prop('value'));
        expect(labels).toEqual(['apple', 'orange', 'banana']);
      });

      it('should use optionLabels for rendering labels', () => {
        const component = mountWithI18nProvider(
          <Field
            setting={{
              ...setting,
              isCustom: true,
            }}
            save={save}
            clear={clear}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
          />
        );
        const select = findTestSubject(component, `advancedSetting-editField-${setting.name}`);
        // @ts-ignore
        const labels = select.find('option').map(option => option.text());
        expect(labels).toEqual(['Apple', 'Orange', 'banana']);
      });
    }

    const setup = () => {
      const Wrapper = (props: Record<string, any>) => (
        <I18nProvider>
          <Field
            setting={setting}
            save={save}
            clear={clear}
            enableSaving={true}
            toasts={notificationServiceMock.createStartContract().toasts}
            dockLinks={docLinksServiceMock.createStartContract().links}
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

        it('should be able to change value from no value and cancel', async () => {
          await (component.instance() as Field).onImageChange([userValue]);
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-cancelEditField-${setting.name}`).simulate(
            'click'
          );
          expect(
            (component.instance() as Field).state.unsavedValue ===
              (component.instance() as Field).state.savedValue
          ).toBe(true);
        });

        it('should be able to change value and save', async () => {
          await (component.instance() as Field).onImageChange([userValue]);
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-saveEditField-${setting.name}`).simulate(
            'click'
          );
          expect(save).toBeCalled();
          component.setState({ savedValue: userValue });
          await wrapper.setProps({
            setting: {
              ...(component.instance() as Field).props.setting,
              value: userValue,
            },
          });

          await (component.instance() as Field).cancelChangeImage();
          wrapper.update();
        });

        it('should be able to change value from existing value and save', async () => {
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-changeImage-${setting.name}`).simulate('click');

          const newUserValue = `${userValue}=`;
          await (component.instance() as Field).onImageChange([newUserValue]);
          const updated2 = wrapper.update();
          findTestSubject(updated2, `advancedSetting-saveEditField-${setting.name}`).simulate(
            'click'
          );
          expect(save).toBeCalled();
          component.setState({ savedValue: newUserValue });
          await wrapper.setProps({
            setting: {
              ...(component.instance() as Field).props.setting,
              value: newUserValue,
            },
          });
          wrapper.update();
        });

        it('should be able to reset to default value', async () => {
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-resetField-${setting.name}`).simulate('click');
          expect(clear).toBeCalled();
        });
      });
    } else if (type === 'markdown' || type === 'json') {
      describe(`for changing ${type} setting`, () => {
        const { wrapper, component } = setup();
        const userValue = userValues[type];
        const fieldUserValue = userValue;

        it('should be able to change value and cancel', async () => {
          (component.instance() as Field).onCodeEditorChange(fieldUserValue as UiSettingsType);
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-cancelEditField-${setting.name}`).simulate(
            'click'
          );
          expect(
            (component.instance() as Field).state.unsavedValue ===
              (component.instance() as Field).state.savedValue
          ).toBe(true);
        });

        it('should be able to change value and save', async () => {
          (component.instance() as Field).onCodeEditorChange(fieldUserValue as UiSettingsType);
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-saveEditField-${setting.name}`).simulate(
            'click'
          );
          expect(save).toBeCalled();
          component.setState({ savedValue: fieldUserValue });
          await wrapper.setProps({
            setting: {
              ...(component.instance() as Field).props.setting,
              value: userValue,
            },
          });
          wrapper.update();
        });

        if (type === 'json') {
          it('should be able to clear value and have empty object populate', async () => {
            (component.instance() as Field).onCodeEditorChange('' as UiSettingsType);
            wrapper.update();
            expect((component.instance() as Field).state.unsavedValue).toEqual('{}');
          });
        }

        it('should be able to reset to default value', async () => {
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-resetField-${setting.name}`).simulate('click');
          expect(clear).toBeCalled();
        });
      });
    } else {
      describe(`for changing ${type} setting`, () => {
        const { wrapper, component } = setup();
        // @ts-ignore
        const userValue = userValues[type];
        const fieldUserValue = type === 'array' ? userValue.join(', ') : userValue;

        if (setting.validation) {
          // @ts-ignore
          const invalidUserValue = invalidUserValues[type];
          it('should display an error when validation fails', async () => {
            (component.instance() as Field).onFieldChange(invalidUserValue);
            const updated = wrapper.update();
            const errorMessage = updated.find('.euiFormErrorText').text();
            expect(errorMessage).toEqual((setting.validation as StringValidation).message);
          });
        }

        it('should be able to change value and cancel', async () => {
          (component.instance() as Field).onFieldChange(fieldUserValue);
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-cancelEditField-${setting.name}`).simulate(
            'click'
          );
          expect(
            (component.instance() as Field).state.unsavedValue ===
              (component.instance() as Field).state.savedValue
          ).toBe(true);
        });

        it('should be able to change value and save', async () => {
          (component.instance() as Field).onFieldChange(fieldUserValue);
          const updated = wrapper.update();
          findTestSubject(updated, `advancedSetting-saveEditField-${setting.name}`).simulate(
            'click'
          );
          expect(save).toBeCalled();
          component.setState({ savedValue: fieldUserValue });
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
          expect(clear).toBeCalled();
        });
      });
    }
  });

  it('should show a reload toast when saving setting requiring a page reload', async () => {
    const setting = {
      ...settings.string,
      requiresPageReload: true,
    };
    const toasts = notificationServiceMock.createStartContract().toasts;
    const wrapper = mountWithI18nProvider(
      <Field
        setting={setting}
        save={save}
        clear={clear}
        enableSaving={true}
        toasts={toasts}
        dockLinks={docLinksServiceMock.createStartContract().links}
      />
    );
    (wrapper.instance() as Field).onFieldChange({ target: { value: 'a new value' } });
    const updated = wrapper.update();
    findTestSubject(updated, `advancedSetting-saveEditField-${setting.name}`).simulate('click');
    expect(save).toHaveBeenCalled();
    await save();
    expect(toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Please reload the page'),
      })
    );
  });
});
