/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, ChangeEvent, FormEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiBasicTable,
  EuiFieldText,
  useGeneratedHtmlId,
  EuiForm,
  EuiFormRow,
  EuiButtonIcon,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';

import * as utils from './utils';

export interface DevToolsVariablesFlyoutProps {
  onClose: () => void;
  onSaveVariables: (newVariables: DevToolsVariable[]) => void;
  variables: [];
}

export interface DevToolsVariable {
  id: string;
  name: string;
  value: string;
}

export const DevToolsVariablesFlyout = (props: DevToolsVariablesFlyoutProps) => {
  const [variables, setVariables] = useState<DevToolsVariable[]>(props.variables);
  const formId = useGeneratedHtmlId({ prefix: '__console' });

  const addNewVariable = useCallback(() => {
    setVariables((v) => [...v, utils.generateEmptyVariableField()]);
  }, []);

  const deleteVariable = useCallback(
    (id: string) => {
      const updatedVariables = utils.deleteVariable(variables, id);
      setVariables(updatedVariables);
    },
    [variables]
  );

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      props.onSaveVariables(variables.filter(({ name, value }) => name.trim() && value));
    },
    [props, variables]
  );

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>, id: string) => {
      const { name, value } = event.target;
      const editedVariables = utils.editVariable(name, value, id, variables);
      setVariables(editedVariables);
    },
    [variables]
  );

  const columns: Array<EuiBasicTableColumn<DevToolsVariable>> = [
    {
      field: 'name',
      name: i18n.translate('console.variablesPage.variablesTable.columns.variableHeader', {
        defaultMessage: 'Variable name',
      }),
      render: (name, { id }) => {
        // Avoid characters that get URL-encoded, because they'll result in unusable variable names.
        const isInvalid = name && !name.match(/^[a-zA-Z0-9]+$/g);
        return (
          <EuiFormRow
            isInvalid={isInvalid}
            error={[
              <FormattedMessage
                id="console.variablesPage.variablesTable.variableInputError.validCharactersText"
                defaultMessage="Only letters and numbers are allowed"
              />,
            ]}
            fullWidth={true}
            css={{ flexGrow: 1 }}
          >
            <EuiFieldText
              data-test-subj="variablesNameInput"
              name="name"
              value={name}
              onChange={(e) => onChange(e, id)}
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
          onChange={(e) => onChange(e, id)}
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
    <EuiFlyout onClose={props.onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage id="console.variablesPage.pageTitle" defaultMessage="Variables" />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="console.variablesPage.descriptionText"
              defaultMessage="Define variables and use them in your requests in the form of {variable}."
              values={{
                variable: (
                  <code>
                    <FormattedMessage
                      id="console.variablesPage.descriptionText.variableNameText"
                      defaultMessage="{variableName}"
                      values={{
                        variableName: '${variableName}',
                      }}
                    />
                  </code>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm id={formId} component="form" onSubmit={onSubmit}>
          <EuiBasicTable items={variables} columns={columns} />
          <EuiButtonEmpty
            data-test-subj="variablesAddButton"
            iconType="plus"
            onClick={addNewVariable}
          >
            <FormattedMessage id="console.variablesPage.addButtonLabel" defaultMessage="Add" />
          </EuiButtonEmpty>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="variablesCancelButton" onClick={props.onClose}>
              <FormattedMessage
                id="console.variablesPage.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill data-test-subj="variablesSaveButton" type="submit" form={formId}>
              <FormattedMessage id="console.variablesPage.saveButtonLabel" defaultMessage="Save" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
