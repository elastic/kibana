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

jest.mock('ui/kfetch', () => ({}));

import React from 'react';

import { npStart } from 'ui/new_platform';
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';

jest.mock('brace/mode/groovy', () => ({}));
jest.mock('ui/new_platform');

import { FieldEditor } from './field_editor';

jest.mock('@elastic/eui', () => ({
  EuiBasicTable: 'eui-basic-table',
  EuiButton: 'eui-button',
  EuiButtonEmpty: 'eui-button-empty',
  EuiCallOut: 'eui-call-out',
  EuiCode: 'eui-code',
  EuiConfirmModal: 'eui-confirm-modal',
  EuiFieldNumber: 'eui-field-number',
  EuiFieldText: 'eui-field-text',
  EuiFlexGroup: 'eui-flex-group',
  EuiFlexItem: 'eui-flex-item',
  EuiForm: 'eui-form',
  EuiFormRow: 'eui-form-row',
  EuiIcon: 'eui-icon',
  EuiLink: 'eui-link',
  EuiOverlayMask: 'eui-overlay-mask',
  EuiSelect: 'eui-select',
  EuiSpacer: 'eui-spacer',
  EuiText: 'eui-text',
  EuiTextArea: 'eui-textArea',
  htmlIdGenerator: () => 42,
  palettes: {
    euiPaletteColorBlind: { colors: ['red'] },
  },
}));

jest.mock('ui/scripting_languages', () => ({
  GetEnabledScriptingLanguagesProvider: jest
    .fn()
    .mockImplementation(() => () => ['painless', 'testlang']),
  getSupportedScriptingLanguages: () => ['painless'],
  getDeprecatedScriptingLanguages: () => ['testlang'],
}));

jest.mock('ui/documentation_links', () => ({
  getDocLink: doc => `(docLink for ${doc})`,
}));

jest.mock('ui/notify', () => ({
  toastNotifications: {
    addSuccess: jest.fn(),
  },
}));

jest.mock('./components/scripting_call_outs', () => ({
  ScriptingDisabledCallOut: 'scripting-disabled-callOut',
  ScriptingWarningCallOut: 'scripting-warning-callOut',
  ScriptingHelpFlyout: 'scripting-help-flyout',
}));

jest.mock('./components/field_format_editor', () => ({
  FieldFormatEditor: 'field-format-editor',
}));

const fields = [
  {
    name: 'foobar',
  },
];
fields.getByName = name => {
  const fields = {
    foobar: {
      name: 'foobar',
    },
  };
  return fields[name];
};

class Format {
  static id = 'test_format';
  static title = 'Test format';
  params() {}
}

const field = {
  scripted: true,
  type: 'number',
  lang: 'painless',
  format: new Format(),
};

const helpers = {
  Field: () => {},
  getConfig: () => {},
  $http: () => {},
  fieldFormatEditors: {},
  redirectAway: () => {},
};

describe('FieldEditor', () => {
  let indexPattern;

  beforeEach(() => {
    indexPattern = {
      fields,
    };

    npStart.plugins.data.fieldFormats.getDefaultType = jest.fn(() => Format);
    npStart.plugins.data.fieldFormats.getByFieldType = jest.fn(fieldType => {
      if (fieldType === 'number') {
        return [Format];
      }
    });
  });

  it('should render create new scripted field correctly', async () => {
    const component = shallowWithI18nProvider(
      <FieldEditor indexPattern={indexPattern} field={field} helpers={helpers} />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should render edit scripted field correctly', async () => {
    const testField = {
      ...field,
      name: 'test',
      script: 'doc.test.value',
    };
    indexPattern.fields.push(testField);
    indexPattern.fields.getByName = name => {
      const fields = {
        [testField.name]: testField,
      };
      return fields[name];
    };

    const component = shallowWithI18nProvider(
      <FieldEditor indexPattern={indexPattern} field={testField} helpers={helpers} />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should show deprecated lang warning', async () => {
    const testField = {
      ...field,
      name: 'test',
      script: 'doc.test.value',
      lang: 'testlang',
    };
    indexPattern.fields.push(testField);
    indexPattern.fields.getByName = name => {
      const fields = {
        [testField.name]: testField,
      };
      return fields[name];
    };

    const component = shallowWithI18nProvider(
      <FieldEditor indexPattern={indexPattern} field={testField} helpers={helpers} />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should show conflict field warning', async () => {
    const testField = { ...field };
    const component = shallowWithI18nProvider(
      <FieldEditor indexPattern={indexPattern} field={testField} helpers={helpers} />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.instance().onFieldChange('name', 'foobar');
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should show multiple type field warning with a table containing indices', async () => {
    const testField = {
      ...field,
      name: 'test-conflict',
      conflictDescriptions: {
        long: ['index_name_1', 'index_name_2'],
        text: ['index_name_3'],
      },
    };
    const component = shallowWithI18nProvider(
      <FieldEditor indexPattern={indexPattern} field={testField} helpers={helpers} />
    );

    await new Promise(resolve => process.nextTick(resolve));
    component.instance().onFieldChange('name', 'foobar');
    component.update();
    expect(component).toMatchSnapshot();
  });
});
