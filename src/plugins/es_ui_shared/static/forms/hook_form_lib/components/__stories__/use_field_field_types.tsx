/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { action } from '@storybook/addon-actions';
import { EuiText, EuiTextColor, EuiSpacer, EuiHealth } from '@elastic/eui';

import { FieldConfig } from '../../types';
import {
  TextField,
  TextAreaField,
  NumericField,
  ToggleField,
  ComboBoxField,
  CheckBoxField,
  JsonEditorField,
  MultiSelectField,
  RadioGroupField,
  RangeField,
  SelectField,
  SuperSelectField,
} from '../../../components';
import { fieldFormatters } from '../../../helpers';
import { UseField } from '../use_field';

const fieldTypeOptions = [
  'checkBox',
  'comboBox',
  'jsonEditor',
  'multiSelect',
  'number',
  'radioGroup',
  'range',
  'select',
  'superSelect',
  'text',
  'textArea',
  'toggle',
] as const;

type FieldType = (typeof fieldTypeOptions)[number];

const fieldConfigBase: FieldConfig<unknown> = {
  label: 'My field',
};

const getPropsForType = (type: FieldType) => {
  switch (type) {
    case 'text':
      return {
        component: TextField,
      };
    case 'number':
      return {
        component: NumericField,
        config: {
          ...fieldConfigBase,
          formatters: [fieldFormatters.toInt],
        },
      };
    case 'toggle':
      return {
        component: ToggleField,
        defaultValue: true,
      };
    case 'checkBox':
      return {
        component: CheckBoxField,
        defaultValue: true,
      };
    case 'select':
      return {
        component: SelectField,
        defaultValue: 'option_one',
        componentProps: {
          euiFieldProps: {
            options: [
              { value: 'option_one', text: 'Option one' },
              { value: 'option_two', text: 'Option two' },
              { value: 'option_three', text: 'Option three' },
            ],
          },
        },
      };
    case 'superSelect':
      return {
        component: SuperSelectField,
        defaultValue: 'minor',
        componentProps: {
          euiFieldProps: {
            options: [
              {
                value: 'warning',
                inputDisplay: (
                  <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
                    Warning
                  </EuiHealth>
                ),
                disabled: true,
              },
              {
                value: 'minor',
                inputDisplay: (
                  <EuiHealth color="warning" style={{ lineHeight: 'inherit' }}>
                    Minor
                  </EuiHealth>
                ),
              },
              {
                value: 'critical',
                inputDisplay: (
                  <EuiHealth color="danger" style={{ lineHeight: 'inherit' }}>
                    Critical
                  </EuiHealth>
                ),
              },
            ],
          },
        },
      };
    case 'multiSelect':
      // TODO: update MultiSelectField to use <EuiFilterGroup>
      // and <EuiPopOver>
      return {
        component: MultiSelectField,
        euiFieldProps: {
          options: [
            { label: 'Johann Sebastian Bach', checked: 'on' },
            { label: 'Wolfgang Amadeus Mozart', checked: 'on' },
            { label: 'Antonín Dvořák', checked: 'off' },
            { label: 'Dmitri Shostakovich' },
            { label: 'Felix Mendelssohn-Bartholdy' },
            { label: 'Franz Liszt' },
            { label: 'Franz Schubert' },
            { label: 'Frédéric Chopin' },
            { label: 'Georg Friedrich Händel' },
            { label: 'Giuseppe Verdi' },
            { label: 'Gustav Mahler' },
            { label: 'Igor Stravinsky' },
            { label: 'Johannes Brahms' },
            { label: 'Joseph Haydn' },
            { label: 'Ludwig van Beethoven' },
            { label: 'Piotr Illitch Tchaïkovsky' },
            { label: 'Robert Schumann' },
            { label: 'Sergej S. Prokofiew' },
          ],
          searchable: true,
        },
      };
    case 'comboBox':
      return {
        component: ComboBoxField,
        defaultValue: [],
      };
    case 'jsonEditor':
      return {
        component: JsonEditorField,
        defaultValue: '',
        componentProps: {
          euiCodeEditorProps: {
            height: '280px',
          },
        },
      };
    case 'radioGroup':
      return {
        component: RadioGroupField,
        defaultValue: 'optionTwo',
        euiFieldProps: {
          options: [
            {
              id: 'optionOne',
              label: 'Option one',
            },
            {
              id: 'optionTwo',
              label: 'Option two is checked by default',
            },
            {
              id: 'radioGroupItemThird',
              label: 'Option three is disabled',
              disabled: true,
            },
          ],
        },
      };
    case 'textArea':
      return {
        component: TextAreaField,
      };
    case 'range':
      return {
        component: RangeField,
        defaultValue: 3,
        config: {
          ...fieldConfigBase,
          serializer: fieldFormatters.toInt,
        },
      };
    default:
      throw new Error(`No props found for ${type} type`);
  }
};

interface Params {
  fieldType: FieldType;
}

export function FieldTypes({ fieldType }: Params) {
  return (
    <>
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            Info: change the field type in the &quot;Controls&quot; panel below.
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer />
      <UseField<any>
        // We add a key to force a reset of the state whenever
        // the field type changes
        key={fieldType}
        path="myField"
        config={{ ...fieldConfigBase }}
        onChange={action('onChange')}
        {...getPropsForType(fieldType)}
      />
    </>
  );
}

FieldTypes.args = {
  fieldType: 'text',
};

FieldTypes.argTypes = {
  fieldType: {
    options: fieldTypeOptions,
    control: { type: 'radio' },
  },
};

FieldTypes.storyName = 'FieldTypes';

FieldTypes.parameters = {
  docs: {
    source: {
      code: `
const MyFormComponent = () => {
  const { form } = useForm({ defaultValue });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            Info: change the field type in the &quot;Controls&quot; panel below.
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer />
      <UseField<any>
        // We add a key to force a reset of the state whenever
        // the field type changes
        key={fieldType}
        path="myField"
        config={{ ...fieldConfigBase }}
        onChange={action('onChange')}
        {...getPropsForType(fieldType)}
      />
      <EuiSpacer />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};
