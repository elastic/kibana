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
import uuid from 'uuid';

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

const generateEmptyVariableField = (): DevToolsVariable => ({
  id: uuid.v4(),
  name: '',
  value: '',
});

export const DevToolsVariablesModal = (props: DevToolsVariablesModalProps) => {
  const [variables, setVariables] = useState<DevToolsVariable[]>(props.variables);
  const formId = useGeneratedHtmlId({ prefix: '__console' });

  const addNewVariable = useCallback(() => {
    setVariables((v) => [...v, generateEmptyVariableField()]);
  }, []);

  const deleteVariable = useCallback(
    (id: string) => {
      const updatedVariables = variables.filter((v) => v.id !== id);
      setVariables(updatedVariables);
    },
    [variables]
  );

  const { onSaveVariables } = props;
  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSaveVariables(variables);
    },
    [onSaveVariables, variables]
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>, id: string) => {
      const { name, value } = e.target;
      const index = variables.findIndex((v) => v.id === id);

      if (index === -1) {
        return;
      } else {
        setVariables((v) => [
          ...v.slice(0, index),
          { ...v[index], [name]: value },
          ...v.slice(index + 1),
        ]);
      }
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
