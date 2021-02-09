/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IndexPattern,
  IndexPatternField,
  FieldFormatInstanceType,
  IndexPatternsService,
} from 'src/plugins/data/public';
import { findTestSubject } from '@elastic/eui/lib/test';

jest.mock('brace/mode/groovy', () => ({}));

import { FieldEditor, FieldEdiorProps } from './field_editor';

import { mockManagementPlugin } from '../../mocks';
import { createComponentWithContext } from '../test_utils';

jest.mock('@elastic/eui', () => ({
  EuiBasicTable: 'eui-basic-table',
  EuiButton: 'eui-button',
  EuiButtonEmpty: 'eui-button-empty',
  EuiCallOut: 'eui-call-out',
  EuiCode: 'eui-code',
  EuiCodeEditor: 'eui-code-editor',
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

const fieldList = [
  {
    name: 'foobar',
  } as IndexPatternField,
];

const fields = {
  getAll: () => fieldList,
};

// @ts-ignore
fields.getByName = (name: string) => {
  return fields.getAll().find((field) => field.name === name);
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

const services = {
  redirectAway: () => {},
  saveIndexPattern: async () => {},
  indexPatternService: {} as IndexPatternsService,
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
      fields,
      getFormatterForField: () => ({ params: () => ({}) }),
      getFormatterForFieldNoDefault: () => ({ params: () => ({}) }),
    } as unknown) as IndexPattern;
  });

  it('should render create new scripted field correctly', async () => {
    const component = createComponentWithContext<FieldEdiorProps>(
      FieldEditor,
      {
        indexPattern,
        spec: (field as unknown) as IndexPatternField,
        services,
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
    fieldList.push((testField as unknown) as IndexPatternField);
    indexPattern.fields.getByName = (name) => {
      const flds = {
        [testField.name]: testField,
      };
      return (flds[name] as unknown) as IndexPatternField;
    };

    const component = createComponentWithContext<FieldEdiorProps>(
      FieldEditor,
      {
        indexPattern,
        spec: (testField as unknown) as IndexPatternField,
        services,
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should display and update a custom label correctly', async () => {
    let testField = ({
      name: 'test',
      format: new Format(),
      lang: undefined,
      type: 'string',
      customLabel: 'Test',
    } as unknown) as IndexPatternField;
    fieldList.push(testField);
    indexPattern.fields.getByName = (name) => {
      const flds = {
        [testField.name]: testField,
      };
      return flds[name];
    };
    indexPattern.fields = {
      ...indexPattern.fields,
      ...{
        update: (fld) => {
          testField = (fld as unknown) as IndexPatternField;
        },
        add: jest.fn(),
      },
    };
    indexPattern.fieldFormatMap = { test: field };
    (indexPattern.deleteFieldFormat as any) = jest.fn();

    const component = createComponentWithContext<FieldEdiorProps>(
      FieldEditor,
      {
        indexPattern,
        spec: (testField as unknown) as IndexPatternField,
        services: {
          redirectAway: () => {},
          indexPatternService: ({
            updateSavedObject: jest.fn(() => Promise.resolve()),
          } as unknown) as IndexPatternsService,
        },
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    const input = findTestSubject(component, 'editorFieldCustomLabel');
    expect(input.props().value).toBe('Test');
    input.simulate('change', { target: { value: 'new Test' } });
    const saveBtn = findTestSubject(component, 'fieldSaveButton');

    await saveBtn.simulate('click');
    await new Promise((resolve) => process.nextTick(resolve));
    expect(testField.customLabel).toEqual('new Test');
  });

  it('should show deprecated lang warning', async () => {
    const testField = {
      ...field,
      name: 'test',
      script: 'doc.test.value',
      lang: 'testlang',
    };
    fieldList.push((testField as unknown) as IndexPatternField);
    indexPattern.fields.getByName = (name) => {
      const flds = {
        [testField.name]: testField,
      };
      return (flds[name] as unknown) as IndexPatternField;
    };

    const component = createComponentWithContext<FieldEdiorProps>(
      FieldEditor,
      {
        indexPattern,
        spec: (testField as unknown) as IndexPatternField,
        services,
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should show conflict field warning', async () => {
    const testField = { ...field };
    const component = createComponentWithContext<FieldEdiorProps>(
      FieldEditor,
      {
        indexPattern,
        spec: (testField as unknown) as IndexPatternField,
        services,
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
    const component = createComponentWithContext<FieldEdiorProps>(
      FieldEditor,
      {
        indexPattern,
        spec: (testField as unknown) as IndexPatternField,
        services,
      },
      mockContext
    );

    await new Promise((resolve) => process.nextTick(resolve));
    (component.instance() as FieldEditor).onFieldChange('name', 'foobar');
    component.update();
    expect(component).toMatchSnapshot();
  });
});
