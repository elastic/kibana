/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiPanel,
  EuiButtonEmpty,
} from '@elastic/eui';

import {
  useForm,
  Form,
  UseField,
  TextField,
  FieldConfig,
  fieldValidators,
  FormConfig,
  ValidationFuncArg,
} from '../../../shared_imports';

import { type DevToolsVariable } from './types';
import { isValidVariableName } from './utils';

export interface VariableEditorFormProps {
  onSubmit: (data: DevToolsVariable) => void;
  onCancel: () => void;
  defaultValue?: DevToolsVariable;
  title?: string;
}

const fieldsConfig: Record<string, FieldConfig> = {
  variableName: {
    label: i18n.translate('console.variablesPage.form.variableNameFieldLabel', {
      defaultMessage: 'Variable name',
    }),
    validations: [
      {
        validator: ({ value }: ValidationFuncArg<any, any>) => {
          if (value.trim() === '') {
            return {
              message: i18n.translate('console.variablesPage.form.variableNameRequiredLabel', {
                defaultMessage: 'This is a required field',
              }),
            };
          }

          if (!isValidVariableName(value)) {
            return {
              message: i18n.translate('console.variablesPage.form.variableNameInvalidLabel', {
                defaultMessage: 'Only letters, numbers and underscores are allowed',
              }),
            };
          }
        },
      },
    ],
  },
  value: {
    label: i18n.translate('console.variablesPage.form.valueFieldLabel', {
      defaultMessage: 'Value',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('console.variablesPage.form.valueRequiredLabel', {
            defaultMessage: 'Value is required',
          })
        ),
      },
    ],
  },
};

export const VariableEditorForm = (props: VariableEditorFormProps) => {
  const onSubmit: FormConfig['onSubmit'] = async (data, isValid) => {
    if (isValid) {
      props.onSubmit({
        ...props.defaultValue,
        ...data,
        ...(props.defaultValue ? {} : { id: uuidv4() }),
      } as DevToolsVariable);
    }
  };

  const { form } = useForm({ onSubmit, defaultValue: props.defaultValue });

  return (
    <>
      <EuiPanel
        paddingSize="l"
        hasShadow={false}
        borderRadius="none"
        grow={false}
        css={{ width: '100%' }}
      >
        <EuiTitle size="xs">
          <h2>
            {props.title ?? (
              <FormattedMessage
                defaultMessage="Add a new variable"
                id="console.variablesPage.addNewVariableTitle"
              />
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="l" />

        <Form form={form}>
          <UseField
            config={fieldsConfig.variableName}
            path="name"
            component={TextField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'nameField',
                placeholder: i18n.translate('console.variablesPage.form.namePlaceholderLabel', {
                  defaultMessage: 'exampleName',
                }),
                prepend: '${',
                append: '}',
              },
            }}
          />

          <UseField
            config={fieldsConfig.value}
            path="value"
            component={TextField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'valueField',
                placeholder: i18n.translate('console.variablesPage.form.valuePlaceholderLabel', {
                  defaultMessage: 'exampleValue',
                }),
              },
            }}
          />

          <EuiSpacer size="l" />

          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => props.onCancel()}>
                <FormattedMessage
                  id="console.variablesPage.addNew.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="save"
                onClick={form.submit}
                data-test-subj="addNewVariableButton"
              >
                <FormattedMessage
                  id="console.variablesPage.addNew.submitButton"
                  defaultMessage="Save changes"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Form>
      </EuiPanel>
    </>
  );
};
