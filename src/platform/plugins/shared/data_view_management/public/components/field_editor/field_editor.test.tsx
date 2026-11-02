/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import type { FieldEdiorProps } from './field_editor';
import { createStubDataView } from '@kbn/data-views-plugin/public/data_views/data_view.stub';
import React from 'react';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public/context';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const monacoModuleName = '@kbn/monaco';

jest.doMock('@kbn/code-editor', () => ({
  CodeEditor: ({
    height: _height,
    languageId: _languageId,
    onChange,
    value,
    width: _width,
    ...props
  }: {
    height: string;
    languageId: string;
    onChange: (value: string) => void;
    value: string;
    width: string;
  }) => (
    <textarea {...props} onChange={(event) => onChange(event.currentTarget.value)} value={value} />
  ),
}));

jest.doMock(monacoModuleName, () => ({
  PainlessLang: {
    ID: 'painless',
  },
}));

jest.mock('./components/scripting_help', () => ({
  ScriptingHelpFlyout: () => null,
}));

jest.mock('../../scripting_languages', () => ({
  getDeprecatedScriptingLanguages: () => ['testlang'],
  getEnabledScriptingLanguages: () => ['painless', 'testlang'],
  getSupportedScriptingLanguages: () => ['painless'],
}));

const DefaultFormat = FieldFormat.from((value: unknown) => String(value));
DefaultFormat.fieldType = '*';
DefaultFormat.id = 'default';
DefaultFormat.title = 'Default format';

const renderWithContext = <Props extends object>(
  Component: React.ComponentType<Props>,
  props: Props,
  mockedContext: Record<string, unknown>
) => {
  return render(
    <KibanaContextProvider services={mockedContext}>
      <Component {...props} />
    </KibanaContextProvider>
  );
};

const createFieldSpec = (overrides: Partial<FieldSpec> = {}): FieldSpec => ({
  aggregatable: true,
  name: '',
  readFromDocValues: false,
  scripted: true,
  searchable: true,
  type: 'number',
  ...overrides,
});

const existingField = createFieldSpec({
  name: 'foobar',
  scripted: false,
  type: 'string',
});

const createIndexPattern = (fields: FieldSpec[] = [existingField]): DataView => {
  const indexPattern = createStubDataView({
    spec: {
      fields: Object.fromEntries(fields.map((field) => [field.name, field])),
      title: 'test-data-view',
    },
  });

  jest.spyOn(indexPattern, 'getFormatterForField').mockReturnValue(new DefaultFormat());
  jest.spyOn(indexPattern, 'setFieldCustomLabel');

  return indexPattern;
};

const createServices = () => {
  const updateSavedObject = jest.fn(() => Promise.resolve());
  const redirectAway = jest.fn();

  return {
    redirectAway,
    services: {
      indexPatternService: {
        updateSavedObject,
      },
      redirectAway,
    },
    updateSavedObject,
  };
};

const createMockedContext = () => ({
  docLinks: {
    links: {
      runtimeFields: {
        overview: 'https://docs.test/runtime-fields',
      },
      scriptedFields: {
        painless: 'https://docs.test/painless',
        scriptAggs: 'https://docs.test/script-aggs',
        scriptFields: 'https://docs.test/script-fields',
      },
    },
  },
  fieldFormats: {
    getByFieldType: jest.fn(() => []),
    getDefaultType: jest.fn(() => DefaultFormat),
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
    },
  },
});

type TestServices = ReturnType<typeof createServices>['services'];
type TestFieldEditorProps = Omit<FieldEdiorProps, 'services'> & {
  services: TestServices;
};

const FieldEditor = jest.requireActual<{
  FieldEditor: React.ComponentType<TestFieldEditorProps>;
}>('./field_editor').FieldEditor;

describe('FieldEditor', () => {
  let mockedContext: ReturnType<typeof createMockedContext>;

  beforeEach(() => {
    mockedContext = createMockedContext();
  });

  const renderFieldEditor = async ({
    indexPattern = createIndexPattern(),
    services = createServices().services,
    spec = createFieldSpec(),
  }: {
    indexPattern?: DataView;
    services?: TestServices;
    spec?: FieldSpec;
  } = {}) => {
    renderWithContext<TestFieldEditorProps>(
      FieldEditor,
      {
        indexPattern,
        services,
        spec,
      },
      mockedContext
    );

    await screen.findByTestId('fieldSaveButton');
  };

  it('should render create new scripted field correctly', async () => {
    await renderFieldEditor();

    expect(screen.getByText('Create scripted field')).toBeVisible();
    expect(screen.getByText('Scripted fields are deprecated')).toBeVisible();
    expect(screen.getByText('runtime fields')).toHaveAttribute(
      'href',
      'https://docs.test/runtime-fields'
    );
    expect(screen.getByTestId('editorFieldName')).toHaveValue('');
    expect(screen.getByTestId('editorFieldLang')).toHaveValue('painless');
    expect(screen.getByTestId('editorFieldType')).toHaveValue('number');
    expect(screen.getByTestId('editorSelectedFormatId')).toHaveValue('');
    expect(screen.getByText('Name is required')).toBeVisible();
    expect(screen.getByText('Script is required')).toBeVisible();
    expect(screen.getByTestId('fieldSaveButton')).toBeDisabled();
  });

  it('should render edit scripted field correctly', async () => {
    const testField = createFieldSpec({
      lang: 'painless',
      name: 'test',
      script: 'doc.test.value',
    });

    await renderFieldEditor({
      indexPattern: createIndexPattern([existingField, testField]),
      spec: testField,
    });

    expect(screen.getByText('Edit test')).toBeVisible();
    expect(screen.queryByTestId('editorFieldName')).not.toBeInTheDocument();
    expect(screen.getByTestId('editorFieldCustomLabel')).toHaveValue('');
    expect(screen.getByTestId('editorFieldScript')).toHaveValue('doc.test.value');
    expect(screen.getByTestId('fieldSaveButton')).toHaveTextContent('Save field');
    expect(screen.getByText('Delete')).toBeVisible();
  });

  it('should display and update a custom label correctly', async () => {
    const user = userEvent.setup();
    const testField = createFieldSpec({
      customLabel: 'Test',
      name: 'test',
      scripted: false,
      type: 'string',
    });
    const indexPattern = createIndexPattern([testField]);
    const { services, updateSavedObject, redirectAway } = createServices();

    await renderFieldEditor({
      indexPattern,
      services,
      spec: testField,
    });

    const customLabelInput = screen.getByTestId('editorFieldCustomLabel');
    expect(customLabelInput).toHaveValue('Test');

    await user.clear(customLabelInput);
    await user.type(customLabelInput, 'new Test');
    await user.click(screen.getByTestId('fieldSaveButton'));

    await waitFor(() => {
      expect(indexPattern.setFieldCustomLabel).toHaveBeenCalledWith('test', 'new Test');
    });
    expect(updateSavedObject).toHaveBeenCalledWith(indexPattern);
    expect(redirectAway).toHaveBeenCalled();
    expect(indexPattern.fields.getByName('test')?.customLabel).toBe('new Test');
  });

  it('should show deprecated lang warning', async () => {
    const testField = createFieldSpec({
      lang: 'testlang',
      name: 'test',
      script: 'doc.test.value',
    });

    await renderFieldEditor({
      indexPattern: createIndexPattern([existingField, testField]),
      spec: testField,
    });

    expect(screen.getByText('Deprecation Warning:')).toBeVisible();
    const deprecationWarning = screen.getByText('Deprecation Warning:').closest('span');
    expect(deprecationWarning).not.toBeNull();
    expect(within(deprecationWarning!).getByText('testlang')).toBeVisible();
    expect(screen.getByText('Painless')).toHaveAttribute('href', 'https://docs.test/painless');
  });

  it('should show conflict field warning', async () => {
    const user = userEvent.setup();

    await renderFieldEditor();

    await user.type(screen.getByTestId('editorFieldName'), 'foobar');

    expect(screen.getByText('Mapping Conflict:')).toBeVisible();
    expect(screen.getByText('foobar')).toBeVisible();
    expect(
      screen.getByText('You already have a field with the name', { exact: false })
    ).toBeVisible();
  });

  it('should show multiple type field warning with a table containing indices', async () => {
    const testField = createFieldSpec({
      conflictDescriptions: {
        long: ['index_name_1', 'index_name_2'],
        text: ['index_name_3'],
      },
      name: 'test-conflict',
    });

    await renderFieldEditor({
      spec: testField,
    });

    expect(screen.getByText('Field type conflict')).toBeVisible();
    expect(
      screen.getByText('The type of this field changes across indices.', { exact: false })
    ).toBeVisible();
    expect(screen.getByText('long')).toBeVisible();
    expect(screen.getByText('index_name_1, index_name_2')).toBeVisible();
    expect(screen.getByText('text')).toBeVisible();
    expect(screen.getByText('index_name_3')).toBeVisible();
  });

  it('should not allow field to have * in the name', async () => {
    const user = userEvent.setup();
    const testField = createFieldSpec({
      name: 'test-field',
      script: 'doc.test.value',
    });

    await renderFieldEditor({
      spec: testField,
    });

    const nameInput = screen.getByTestId('editorFieldName');
    await user.clear(nameInput);
    await user.type(nameInput, 'test*123');

    expect(screen.getByText('The field cannot have * in the name.')).toBeVisible();
  });
});
