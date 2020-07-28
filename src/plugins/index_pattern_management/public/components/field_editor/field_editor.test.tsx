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

import {
  IndexPattern,
  IndexPatternField,
  IIndexPatternFieldList,
  FieldFormatInstanceType,
} from 'src/plugins/data/public';

jest.mock('brace/mode/groovy', () => ({}));

import { FieldEditor } from './field_editor';

import { mockManagementPlugin } from '../../mocks';
import { createComponentWithContext } from '../test_utils';

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
  euiPaletteColorBlind: () => ['red'],
}));

jest.mock('../../scripting_languages', () => ({
  getEnabledScriptingLanguages: () => ['painless', 'testlang'],
  getSupportedScriptingLanguages: () => ['painless'],
  getDeprecatedScriptingLanguages: () => ['testlang'],
}));

jest.mock('./components/scripting_call_outs', () => ({
  ScriptingDisabledCallOut: 'scripting-disabled-callOut',
  ScriptingWarningCallOut: 'scripting-warning-callOut',
  ScriptingHelpFlyout: 'scripting-help-flyout',
}));

jest.mock('./components/field_format_editor', () => ({
  FieldFormatEditor: 'field-format-editor',
}));

const fields: IndexPatternField[] = [
  {
    name: 'foobar',
  } as IndexPatternField,
];

// @ts-ignore
fields.getByName = (name: string) => {
  return fields.find((field) => field.name === name);
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

describe('FieldEditor', () => {
  let indexPattern: IndexPattern;

  const mockContext = mockManagementPlugin.createIndexPatternManagmentContext();
  mockContext.data.fieldFormats.getDefaultType = jest.fn(
    () => (({} as unknown) as FieldFormatInstanceType)
  );
  mockContext.data.fieldFormats.getByFieldType = jest.fn((fieldType) => {
    if (fieldType === 'number') {
      return [({} as unknown) as FieldFormatInstanceType];
    } else {
      return [];
    }
  });

  beforeEach(() => {
    indexPattern = ({
      fields: fields as IIndexPatternFieldList,
    } as unknown) as IndexPattern;
  });

  it('should render create new scripted field correctly', async () => {
    const component = createComponentWithContext(
      FieldEditor,
      {
        indexPattern,
        field: (field as unknown) as IndexPatternField,
        services: { redirectAway: () => {} },
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should render edit scripted field correctly', async () => {
    const testField = {
      ...field,
      name: 'test',
      script: 'doc.test.value',
    };
    indexPattern.fields.push(testField as IndexPatternField);
    indexPattern.fields.getByName = (name) => {
      const flds = {
        [testField.name]: testField,
      };
      return flds[name] as IndexPatternField;
    };

    const component = createComponentWithContext(
      FieldEditor,
      {
        indexPattern,
        field: (testField as unknown) as IndexPatternField,
        services: { redirectAway: () => {} },
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
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
    indexPattern.fields.push((testField as unknown) as IndexPatternField);
    indexPattern.fields.getByName = (name) => {
      const flds = {
        [testField.name]: testField,
      };
      return flds[name] as IndexPatternField;
    };

    const component = createComponentWithContext(
      FieldEditor,
      {
        indexPattern,
        field: (testField as unknown) as IndexPatternField,
        services: { redirectAway: () => {} },
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should show conflict field warning', async () => {
    const testField = { ...field };
    const component = createComponentWithContext(
      FieldEditor,
      {
        indexPattern,
        field: (testField as unknown) as IndexPatternField,
        services: { redirectAway: () => {} },
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    (component.instance() as FieldEditor).onFieldChange('name', 'foobar');
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
    const component = createComponentWithContext(
      FieldEditor,
      {
        indexPattern,
        field: (testField as unknown) as IndexPatternField,
        services: { redirectAway: () => {} },
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    (component.instance() as FieldEditor).onFieldChange('name', 'foobar');
    component.update();
    expect(component).toMatchSnapshot();
  });
});
