/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiBasicTable,
  EuiFieldText,
  EuiFormRow,
  EuiButtonIcon,
  EuiSpacer,
  EuiText,
  EuiPanel,
  EuiButtonEmpty,
  type EuiBasicTableColumn,
} from '@elastic/eui';

import {
  useForm,
  Form,
  UseField,
  TextField,
  FieldConfig,
  fieldValidators,
  FormConfig,
} from '../../../shared_imports';

import * as utils from './utils';

export interface DevToolsVariablesFlyoutProps {
  onSaveVariables: (newVariables: DevToolsVariable[]) => void;
  variables: [];
}

export interface DevToolsVariable {
  id: string;
  name: string;
  value: string;
}

const fieldsConfig: Record<string, FieldConfig>  = {
  variableName: {
    label: i18n.translate('console.variablesPage.form.variableNameFieldLabel', {
      defaultMessage: 'Variable name',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('console.variablesPage.form.variableNameRequiredLabel', {
            defaultMessage: 'Variable name is required',
          })
        ),
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

export const DevToolsVariablesFlyout = (props: DevToolsVariablesFlyoutProps) => {
  const [isAddingVariable, setIsAddingVariable] = useState(false);
  const [variables, setVariables] = useState<DevToolsVariable[]>(props.variables);

  const deleteVariable = useCallback(
    (id: string) => {
      const updatedVariables = utils.deleteVariable(variables, id);
      setVariables(updatedVariables);
    },
    [variables]
  );

  const onSubmit: FormConfig['onSubmit'] = async (data, isValid) => {
    if (isValid) {
      setVariables((v: DevToolsVariable[]) => [...v, {
        ...data,
        id: uuidv4(),
      } as DevToolsVariable]);

      setIsAddingVariable(false);
    }
  };

  const { form } = useForm({ onSubmit });


  const columns: Array<EuiBasicTableColumn<DevToolsVariable>> = [
    {
      field: 'name',
      name: i18n.translate('console.variablesPage.variablesTable.columns.variableHeader', {
        defaultMessage: 'Variable name',
      }),
      render: (name, { id }) => {
        const isInvalid = !utils.isValidVariableName(name);
        return (
          <EuiFormRow
            isInvalid={isInvalid}
            error={[
              <FormattedMessage
                id="console.variablesPage.variablesTable.variableInputError.validCharactersText"
                defaultMessage="Only letters, numbers and underscores are allowed"
              />,
            ]}
            fullWidth={true}
            css={{ flexGrow: 1 }}
          >
            <EuiFieldText
              data-test-subj="variablesNameInput"
              name="name"
              value={name}
              onChange={(e) => console.log({ e, id })}
              isInvalid={isInvalid}
              fullWidth={true}
              aria-label={i18n.translate(
                'console.variablesPage.variablesTable.variableInput.ariaLabel',
                {
                  defaultMessage: 'Variable name',
                }
              )}
            />
          </EuiFormRow>
        );
      },
    },
    {
      field: 'value',
      name: i18n.translate('console.variablesPage.variablesTable.columns.valueHeader', {
        defaultMessage: 'Value',
      }),
      render: (value, { id }) => (
        <EuiFieldText
          data-test-subj="variablesValueInput"
          name="value"
          onChange={(e) => console.log({ e, id })}
          value={value}
          aria-label={i18n.translate('console.variablesPage.variablesTable.valueInput.ariaLabel', {
            defaultMessage: 'Variable value',
          })}
        />
      ),
    },
    {
      field: 'id',
      name: '',
      width: '5%',
      render: (id: string) => (
        <EuiButtonIcon
          iconType="trash"
          aria-label="Delete"
          color="danger"
          onClick={() => deleteVariable(id)}
          data-test-subj="variablesRemoveButton"
        />
      ),
    },
  ];

  return (
    <>
      <EuiTitle>
        <h2>
          <FormattedMessage id="console.variablesPage.pageTitle" defaultMessage="Variables" />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage id="console.variablesPage.pageDescription" defaultMessage="Define and reuse placeholders for dynamic values in your queries." />
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiBasicTable items={variables} columns={columns} />
      {isAddingVariable && (
        <>
          <EuiPanel paddingSize="l" hasShadow={false} borderRadius="none" grow={false}>
            <EuiTitle size="xs">
              <h2>
                <FormattedMessage
                  defaultMessage="Add a new variable"
                  id="console.variablesPage.addNewVariableTitle"
                />
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
                    placeholder: i18n.translate('console.variablesPage.form.namePlaceholderLabel', {
                      defaultMessage: 'exampleName',
                    }),
                    prepend: '${',
                    append: '}',
                  }
                }}
              />

              <UseField
                config={fieldsConfig.variableName}
                path="value"
                component={TextField}
                componentProps={{
                  euiFieldProps: {
                    placeholder: i18n.translate('console.variablesPage.form.valuePlaceholderLabel', {
                      defaultMessage: 'exampleValue',
                    }),
                  }
                }}
              />

              <EuiSpacer size="l" />

              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => setIsAddingVariable(false)}
                  >
                    <FormattedMessage id="console.variablesPage.addNew.cancelButton" defaultMessage="Cancel" />
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton fill iconType="save" onClick={form.submit}>
                    <FormattedMessage id="console.variablesPage.addNew.submitButton" defaultMessage="Save changes" />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Form>
          </EuiPanel>
        </>
      )}

      <div>
        <EuiSpacer size="m" />
        <EuiButton
          data-test-subj="variablesAddButton"
          iconType="plusInCircle"
          onClick={() => setIsAddingVariable(true)}
          disabled={isAddingVariable}
        >
          <FormattedMessage id="console.variablesPage.addButtonLabel" defaultMessage="Add variable" />
        </EuiButton>
      </div>
    </>
  );
};
