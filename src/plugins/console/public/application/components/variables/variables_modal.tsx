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
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiBasicTable,
  EuiFieldText,
  useGeneratedHtmlId,
  EuiForm,
  EuiButtonIcon,
  type EuiBasicTableColumn,
} from '@elastic/eui';

import * as utils from './utils';

export interface DevToolsVariablesModalProps {
  onClose: () => void;
  onSaveVariables: (newVariables: DevToolsVariable[]) => void;
  variables: [];
}

export interface DevToolsVariable {
  id: string;
  name: string;
  value: string;
}

export const DevToolsVariablesModal = (props: DevToolsVariablesModalProps) => {
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
      props.onSaveVariables(variables.filter(({ name, value }) => name && value));
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
        defaultMessage: 'Variable',
      }),
      render: (name, { id }) => {
        const textField = (
          <EuiFieldText
            data-test-subj="variablesNameInput"
            placeholder="Add a new variable"
            fullWidth
            name="name"
            value={name}
            onChange={(e) => onChange(e, id)}
          />
        );
        return <>{textField}</>;
      },
    },
    {
      field: 'value',
      name: i18n.translate('console.variablesPage.variablesTable.columns.valueHeader', {
        defaultMessage: 'Value',
      }),
      render: (value, { id }) => {
        const textField = (
          <EuiFieldText
            data-test-subj="variablesValueInput"
            placeholder="Add a new variable"
            fullWidth
            name="value"
            onChange={(e) => onChange(e, id)}
            value={value}
          />
        );
        return <>{textField}</>;
      },
    },
    {
      field: 'id',
      name: '',
      width: '5%',
      render: (id, item) => {
        const button = (
          <EuiButtonIcon
            iconType="trash"
            aria-label="Delete"
            color="danger"
            onClick={() => deleteVariable(id)}
            data-test-subj="variablesRemoveButton"
          />
        );
        return <>{button}</>;
      },
    },
  ];

  return (
    <EuiModal
      data-test-subj="devToolsVariablesModal"
      onClose={props.onClose}
      style={{ width: 800 }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="console.variablesPage.pageTitle"
            defaultMessage="Console Variables"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
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
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="variablesCancelButton" onClick={props.onClose}>
          <FormattedMessage id="console.variablesPage.cancelButtonLabel" defaultMessage="Cancel" />
        </EuiButtonEmpty>

        <EuiButton fill data-test-subj="variablesSaveButton" type="submit" form={formId}>
          <FormattedMessage id="console.variablesPage.saveButtonLabel" defaultMessage="Save" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
