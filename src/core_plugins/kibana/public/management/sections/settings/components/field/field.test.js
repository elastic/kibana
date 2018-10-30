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
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';

import { findTestSubject } from '@elastic/eui/lib/test';
import { Field } from './field';

jest.mock('ui/notify', () => ({
  toastNotifications: {
    addDanger: () => {}
  }
}));

jest.mock('brace/theme/textmate', () => 'brace/theme/textmate');
jest.mock('brace/mode/markdown', () => 'brace/mode/markdown');

const settings = {
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
    options: null,
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
    options: null,
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
    options: {
      maxSize: {
        length: 1000,
        displayName: '1 kB',
        description: 'Description for 1 kB',
      }
    },
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
    options: null,
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
    options: null,
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
    options: null,
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
    options: null,
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
};
const save = jest.fn(() => Promise.resolve());
const clear = jest.fn(() => Promise.resolve());

describe('Field', () => {
  Object.keys(settings).forEach(type => {
    const setting = settings[type];

    describe(`for ${type} setting`, () => {
      it('should render default value if there is no user value set', async () => {
        const component = shallowWithIntl(
          <Field.WrappedComponent
            setting={setting}
            save={save}
            clear={clear}
          />
        );

        expect(component).toMatchSnapshot();
      });

      it('should render as read only with help text if overridden', async () => {
        const component = shallowWithIntl(
          <Field.WrappedComponent
            setting={{
              ...setting,
              value: userValues[type],
              isOverridden: true,
            }}
            save={save}
            clear={clear}
          />
        );

        expect(component).toMatchSnapshot();
      });

      it('should render user value if there is user value is set', async () => {
        const component = shallowWithIntl(
          <Field.WrappedComponent
            setting={{
              ...setting,
              value: userValues[type],
            }}
            save={save}
            clear={clear}
          />
        );

        expect(component).toMatchSnapshot();
      });

      it('should render custom setting icon if it is custom', async () => {
        const component = shallowWithIntl(
          <Field.WrappedComponent
            setting={{
              ...setting,
              isCustom: true,
            }}
            save={save}
            clear={clear}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    if(type === 'image') {
      describe(`for changing ${type} setting`, () => {
        const component = mountWithIntl(
          <Field.WrappedComponent
            setting={setting}
            save={save}
            clear={clear}
          />
        );

        const userValue = userValues[type];
        component.instance().getImageAsBase64 = (file) => Promise.resolve(file);

        it('should be able to change value from no value and cancel', async () => {
          await component.instance().onImageChange([userValue]);
          component.update();
          findTestSubject(component, `advancedSetting-cancelEditField-${setting.name}`).simulate('click');
          expect(component.instance().state.unsavedValue === component.instance().state.savedValue).toBe(true);
        });

        it('should be able to change value and save', async () => {
          await component.instance().onImageChange([userValue]);
          component.update();
          findTestSubject(component, `advancedSetting-saveEditField-${setting.name}`).simulate('click');
          expect(save).toBeCalled();
          component.setState({ savedValue: userValue });
          await component.setProps({ setting: {
            ...component.instance().props.setting,
            value: userValue,
          } });
          component.update();
        });

        it('should be able to change value from existing value and save', async () => {
          const newUserValue = `${userValue}=`;
          findTestSubject(component, `advancedSetting-changeImage-${setting.name}`).simulate('click');
          await component.instance().onImageChange([newUserValue]);
          component.update();
          findTestSubject(component, `advancedSetting-saveEditField-${setting.name}`).simulate('click');
          expect(save).toBeCalled();
          component.setState({ savedValue: newUserValue });
          await component.setProps({ setting: {
            ...component.instance().props.setting,
            value: newUserValue,
          } });
          component.update();
        });

        it('should be able to reset to default value', async () => {
          findTestSubject(component, `advancedSetting-resetField-${setting.name}`).simulate('click');
          expect(clear).toBeCalled();
        });
      });
    } else if(type === 'markdown' || type === 'json') {
      describe(`for changing ${type} setting`, () => {
        const component = mountWithIntl(
          <Field.WrappedComponent
            setting={setting}
            save={save}
            clear={clear}
          />
        );

        const userValue = userValues[type];
        const fieldUserValue = userValue;

        it('should be able to change value and cancel', async () => {
          component.instance().onCodeEditorChange(fieldUserValue);
          component.update();
          findTestSubject(component, `advancedSetting-cancelEditField-${setting.name}`).simulate('click');
          expect(component.instance().state.unsavedValue === component.instance().state.savedValue).toBe(true);
        });

        it('should be able to change value and save', async () => {
          component.instance().onCodeEditorChange(fieldUserValue);
          component.update();
          findTestSubject(component, `advancedSetting-saveEditField-${setting.name}`).simulate('click');
          expect(save).toBeCalled();
          component.setState({ savedValue: fieldUserValue });
          await component.setProps({ setting: {
            ...component.instance().props.setting,
            value: userValue,
          } });
          component.update();
        });

        if(type === 'json') {
          it('should be able to clear value and have empty object populate', async () => {
            component.instance().onCodeEditorChange('');
            component.update();
            expect(component.instance().state.unsavedValue).toEqual('{}');
          });
        }

        it('should be able to reset to default value', async () => {
          findTestSubject(component, `advancedSetting-resetField-${setting.name}`).simulate('click');
          expect(clear).toBeCalled();
        });
      });
    } else {
      describe(`for changing ${type} setting`, () => {
        const component = mountWithIntl(
          <Field.WrappedComponent
            setting={setting}
            save={save}
            clear={clear}
          />
        );

        const userValue = userValues[type];
        const fieldUserValue = type === 'array' ? userValue.join(', ') : userValue;

        it('should be able to change value and cancel', async () => {
          component.instance().onFieldChange({ target: { value: fieldUserValue } });
          component.update();
          findTestSubject(component, `advancedSetting-cancelEditField-${setting.name}`).simulate('click');
          expect(component.instance().state.unsavedValue === component.instance().state.savedValue).toBe(true);
        });

        it('should be able to change value and save', async () => {
          component.instance().onFieldChange({ target: { value: fieldUserValue } });
          component.update();
          findTestSubject(component, `advancedSetting-saveEditField-${setting.name}`).simulate('click');
          expect(save).toBeCalled();
          component.setState({ savedValue: fieldUserValue });
          await component.setProps({ setting: {
            ...component.instance().props.setting,
            value: userValue,
          } });
          component.update();
        });

        it('should be able to reset to default value', async () => {
          findTestSubject(component, `advancedSetting-resetField-${setting.name}`).simulate('click');
          expect(clear).toBeCalled();
        });
      });
    }
  });
});
