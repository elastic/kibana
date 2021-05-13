/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiComboBoxOptionOption,
  EuiCode,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';
import type { CoreStart } from 'src/core/public';

import {
  Form,
  useForm,
  useFormData,
  FormHook,
  UseField,
  TextField,
  RuntimeType,
  IndexPattern,
  DataPublicPluginStart,
} from '../../shared_imports';
import { Field, InternalFieldType, PluginStart } from '../../types';
import { useFieldEditorContext } from '../field_editor_context';

import { RUNTIME_FIELD_OPTIONS } from './constants';
import { schema } from './form_schema';
import { getNameFieldConfig } from './lib';
import {
  TypeField,
  CustomLabelField,
  ScriptField,
  FormatField,
  PopularityField,
  ScriptSyntaxError,
} from './form_fields';
import { FormRow } from './form_row';
import { AdvancedParametersSection } from './advanced_parameters_section';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  submit: FormHook<Field>['submit'];
}

export interface FieldFormInternal extends Omit<Field, 'type' | 'internalType'> {
  type: Array<EuiComboBoxOptionOption<RuntimeType>>;
  __meta__: {
    isCustomLabelVisible: boolean;
    isValueVisible: boolean;
    isFormatVisible: boolean;
    isPopularityVisible: boolean;
  };
}

export interface Props {
  /** Link URLs to our doc site */
  links: {
    runtimePainless: string;
  };
  /** Optional field to edit */
  field?: Field;
  /** Handler to receive state changes updates */
  onChange?: (state: FieldEditorFormState) => void;
  indexPattern: IndexPattern;
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: DataPublicPluginStart['fieldFormats'];
  uiSettings: CoreStart['uiSettings'];
  /** Context object */
  ctx: {
    /** The internal field type we are dealing with (concrete|runtime)*/
    fieldTypeToProcess: InternalFieldType;
    /**
     * An array of field names not allowed.
     * e.g we probably don't want a user to give a name of an existing
     * runtime field (for that the user should edit the existing runtime field).
     */
    namesNotAllowed: string[];
    /**
     * An array of existing concrete fields. If the user gives a name to the runtime
     * field that matches one of the concrete fields, a callout will be displayed
     * to indicate that this runtime field will shadow the concrete field.
     * It is also used to provide the list of field autocomplete suggestions to the code editor.
     */
    existingConcreteFields: Array<{ name: string; type: string }>;
  };
  syntaxError: ScriptSyntaxError;
}

const geti18nTexts = (): {
  [key: string]: { title: string; description: JSX.Element | string };
} => ({
  customLabel: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.customLabelTitle', {
      defaultMessage: 'Set custom label',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.customLabelDescription', {
      defaultMessage: `Create a label to display in place of the field name in Discover, Maps, and Visualize. Useful for shortening a long field name.  Queries and filters use the original field name.`,
    }),
  },
  value: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.valueTitle', {
      defaultMessage: 'Set value',
    }),
    description: (
      <FormattedMessage
        id="indexPatternFieldEditor.editor.form.valueDescription"
        defaultMessage="Set a value for the field instead of retrieving it from the field with the same name in {source}."
        values={{
          source: <EuiCode>{'_source'}</EuiCode>,
        }}
      />
    ),
  },
  format: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.formatTitle', {
      defaultMessage: 'Set format',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.formatDescription', {
      defaultMessage: `Set your preferred format for displaying the value. Changing the format can affect the value and prevent highlighting in Discover.`,
    }),
  },
  popularity: {
    title: i18n.translate('indexPatternFieldEditor.editor.form.popularityTitle', {
      defaultMessage: 'Set popularity',
    }),
    description: i18n.translate('indexPatternFieldEditor.editor.form.popularityDescription', {
      defaultMessage: `Adjust the popularity to make the field appear higher or lower in the fields list.  By default, Discover orders fields from most selected to least selected.`,
    }),
  },
});

const changeWarning = i18n.translate('indexPatternFieldEditor.editor.form.changeWarning', {
  defaultMessage:
    'Changing name or type can break searches and visualizations that rely on this field.',
});

const formDeserializer = (field: Field): FieldFormInternal => {
  let fieldType: Array<EuiComboBoxOptionOption<RuntimeType>>;
  if (!field.type) {
    fieldType = [RUNTIME_FIELD_OPTIONS[0]];
  } else {
    const label = RUNTIME_FIELD_OPTIONS.find(({ value }) => value === field.type)?.label;
    fieldType = [{ label: label ?? field.type, value: field.type as RuntimeType }];
  }

  return {
    ...field,
    type: fieldType,
    __meta__: {
      isCustomLabelVisible: field.customLabel !== undefined,
      isValueVisible: field.script !== undefined,
      isFormatVisible: field.format !== undefined,
      isPopularityVisible: field.popularity !== undefined,
    },
  };
};

const formSerializer = (field: FieldFormInternal): Field => {
  const { __meta__, type, ...rest } = field;
  return {
    type: type[0].value!,
    ...rest,
  };
};

const mockDataPreview = {
  index: 'kibana_sample_data_logs',
  script: "emit('test')",
  document: {
    referer: ['http://twitter.com/success/fyodor-yurchikhin'],
    request: ['/beats/filebeat/filebeat-6.3.2-linux-x86_64.tar.gz'],
    agent: ['Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1'],
    extension: ['gz'],
    'tags.keyword': ['error', 'info'],
    'geo.coordinates': [
      {
        coordinates: [-92.33716583, 32.72495583],
        type: 'Point',
      },
    ],
    'geo.dest': ['IN'],
    'response.keyword': ['200'],
    'machine.os': ['ios'],
    utc_time: ['2021-05-13T10:49:17.763Z'],
    'agent.keyword': ['Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1'],
    clientip: ['199.233.207.139'],
    host: ['artifacts.elastic.co'],
    'machine.ram': [12884901888],
    'extension.keyword': ['gz'],
    'host.keyword': ['artifacts.elastic.co'],
    'machine.os.keyword': ['ios'],
    hour_of_day: [10],
    'geo.srcdest': ['US:IN'],
    timestamp: ['2021-05-13T10:49:17.763Z'],
    ip: ['199.233.207.139'],
    'request.keyword': ['/beats/filebeat/filebeat-6.3.2-linux-x86_64.tar.gz'],
    index: ['kibana_sample_data_logs'],
    'geo.src': ['US'],
    'index.keyword': ['kibana_sample_data_logs'],
    message: [
      '199.233.207.139 - - [2018-08-02T10:49:17.763Z] "GET /beats/filebeat/filebeat-6.3.2-linux-x86_64.tar.gz HTTP/1.1" 200 7652 "-" "Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1"',
    ],
    url: [
      'https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-6.3.2-linux-x86_64.tar.gz',
    ],
    'url.keyword': [
      'https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-6.3.2-linux-x86_64.tar.gz',
    ],
    tags: ['error', 'info'],
    '@timestamp': ['2021-05-13T10:49:17.763Z'],
    bytes: [7652],
    response: ['200'],
    'message.keyword': [
      '199.233.207.139 - - [2018-08-02T10:49:17.763Z] "GET /beats/filebeat/filebeat-6.3.2-linux-x86_64.tar.gz HTTP/1.1" 200 7652 "-" "Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1"',
    ],
    'event.dataset': ['sample_web_logs'],
  },
};

const FieldEditorComponent = ({
  field,
  onChange,
  links,
  indexPattern,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
  syntaxError,
  ctx: { fieldTypeToProcess, namesNotAllowed, existingConcreteFields },
}: Props) => {
  const {
    apiService: { usePreviewField },
  } = useFieldEditorContext();
  const { form } = useForm<Field, FieldFormInternal>({
    defaultValue: field,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });
  const { submit, isValid: isFormValid, isSubmitted } = form;
  const { clear: clearSyntaxError } = syntaxError;

  const [{ type }] = useFormData<FieldFormInternal>({ form });

  const [script, setScript] = useState<string | null>(null);
  const { data } = usePreviewField({
    script,
    index: mockDataPreview.index,
    document: mockDataPreview.document,
  });

  const nameFieldConfig = getNameFieldConfig(namesNotAllowed, field);
  const i18nTexts = geti18nTexts();

  const previewField = useCallback(() => {
    setScript(mockDataPreview.script);
  }, []);

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, submit });
    }
  }, [onChange, isFormValid, isSubmitted, submit]);

  useEffect(() => {
    // Whenever the field "type" changes we clear any possible painless syntax
    // error as it is possibly stale.
    clearSyntaxError();
  }, [type, clearSyntaxError]);

  useEffect(() => {
    // TODO: remove console.log
    console.log('Preview update', data); // eslint-disable-line
  }, [data]);

  const [{ name: updatedName, type: updatedType }] = useFormData({ form });
  const nameHasChanged = Boolean(field?.name) && field?.name !== updatedName;
  const typeHasChanged =
    Boolean(field?.type) && field?.type !== (updatedType && updatedType[0].value);

  return (
    <Form form={form} className="indexPatternFieldEditor__form">
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={previewField}>Preview field</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        {/* Name */}
        <EuiFlexItem>
          <UseField<string, Field>
            path="name"
            config={nameFieldConfig}
            component={TextField}
            data-test-subj="nameField"
            componentProps={{
              euiFieldProps: {
                disabled: fieldTypeToProcess === 'concrete',
                'aria-label': i18n.translate('indexPatternFieldEditor.editor.form.nameAriaLabel', {
                  defaultMessage: 'Name field',
                }),
              },
            }}
          />
        </EuiFlexItem>

        {/* Type */}
        <EuiFlexItem>
          <TypeField isDisabled={fieldTypeToProcess === 'concrete'} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {(nameHasChanged || typeHasChanged) && (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            color="warning"
            title={changeWarning}
            iconType="alert"
            size="s"
            data-test-subj="changeWarning"
          />
        </>
      )}
      <EuiSpacer size="xl" />

      {/* Set custom label */}
      <FormRow
        title={i18nTexts.customLabel.title}
        description={i18nTexts.customLabel.description}
        formFieldPath="__meta__.isCustomLabelVisible"
        data-test-subj="customLabelRow"
        withDividerRule
      >
        <CustomLabelField />
      </FormRow>

      {/* Set value */}
      {fieldTypeToProcess === 'runtime' && (
        <FormRow
          title={i18nTexts.value.title}
          description={i18nTexts.value.description}
          formFieldPath="__meta__.isValueVisible"
          data-test-subj="valueRow"
          withDividerRule
        >
          <ScriptField
            existingConcreteFields={existingConcreteFields}
            links={links}
            syntaxError={syntaxError}
          />
        </FormRow>
      )}

      {/* Set custom format */}
      <FormRow
        title={i18nTexts.format.title}
        description={i18nTexts.format.description}
        formFieldPath="__meta__.isFormatVisible"
        data-test-subj="formatRow"
        withDividerRule
      >
        <FormatField
          indexPattern={indexPattern}
          fieldFormatEditors={fieldFormatEditors}
          fieldFormats={fieldFormats}
          uiSettings={uiSettings}
        />
      </FormRow>

      {/* Advanced settings */}
      <AdvancedParametersSection>
        <FormRow
          title={i18nTexts.popularity.title}
          description={i18nTexts.popularity.description}
          formFieldPath="__meta__.isPopularityVisible"
          data-test-subj="popularityRow"
          withDividerRule
        >
          <PopularityField />
        </FormRow>
      </AdvancedParametersSection>
    </Form>
  );
};

export const FieldEditor = React.memo(FieldEditorComponent) as typeof FieldEditorComponent;
