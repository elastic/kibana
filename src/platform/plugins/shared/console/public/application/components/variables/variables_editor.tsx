/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiTitle,
  EuiButton,
  EuiBasicTable,
  EuiButtonIcon,
  EuiSpacer,
  EuiText,
  EuiCode,
  useGeneratedHtmlId,
  EuiConfirmModal,
  type EuiBasicTableColumn,
} from '@elastic/eui';

import { VariableEditorForm } from './variables_editor_form';
import * as utils from './utils';
import { type DevToolsVariable } from './types';

export interface Props {
  onSaveVariables: (newVariables: DevToolsVariable[]) => void;
  variables: [];
}

export const VariablesEditor = (props: Props) => {
  const isMounted = useRef(false);
  const [isAddingVariable, setIsAddingVariable] = useState(false);
  const [deleteModalForVariable, setDeleteModalForVariable] = useState<string | null>(null);
  const [variables, setVariables] = useState<DevToolsVariable[]>(props.variables);
  const deleteModalTitleId = useGeneratedHtmlId();

  // Use a ref to persist the BehaviorSubject across renders
  const itemIdToExpandedRowMap$ = useRef(new BehaviorSubject<Record<string, React.ReactNode>>({}));
  // Subscribe to the BehaviorSubject and update local state on change
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});
  // Clear the expanded row map and dispose all the expanded rows
  const collapseExpandedRows = () => itemIdToExpandedRowMap$.current.next({});

  // Subscribe to the BehaviorSubject on mount
  useEffect(() => {
    const subscription = itemIdToExpandedRowMap$.current.subscribe(setItemIdToExpandedRowMap);
    return () => subscription.unsubscribe();
  }, []);

  // Always save variables when they change
  useEffect(() => {
    if (isMounted.current) {
      props.onSaveVariables(variables);
    } else {
      isMounted.current = true;
    }
  }, [variables, props]);

  const toggleDetails = (variableId: string) => {
    const currentMap = itemIdToExpandedRowMap$.current.getValue();
    let itemIdToExpandedRowMapValues = { ...currentMap };

    if (itemIdToExpandedRowMapValues[variableId]) {
      delete itemIdToExpandedRowMapValues[variableId];
    } else {
      // Always close the add variable form when editing a variable
      setIsAddingVariable(false);
      // We only allow one expanded row at a time
      itemIdToExpandedRowMapValues = {};
      itemIdToExpandedRowMapValues[variableId] = (
        <VariableEditorForm
          title={i18n.translate('console.variablesPage.editVariableForm.title', {
            defaultMessage: 'Edit variable',
          })}
          onSubmit={(data: DevToolsVariable) => {
            const updatedVariables = utils.editVariable(data, variables);
            setVariables(updatedVariables);
            collapseExpandedRows();
          }}
          onCancel={() => {
            collapseExpandedRows();
          }}
          defaultValue={variables.find((v) => v.id === variableId)}
        />
      );
    }

    // Update the BehaviorSubject with the new state
    itemIdToExpandedRowMap$.current.next(itemIdToExpandedRowMapValues);
  };

  const deleteVariable = useCallback(
    (id: string) => {
      const updatedVariables = utils.deleteVariable(variables, id);
      setVariables(updatedVariables);
      setDeleteModalForVariable(null);
    },
    [variables, setDeleteModalForVariable]
  );

  const onAddVariable = (data: DevToolsVariable) => {
    setVariables((v: DevToolsVariable[]) => [...v, data]);
    setIsAddingVariable(false);
  };

  const columns: Array<EuiBasicTableColumn<DevToolsVariable>> = [
    {
      field: 'name',
      name: i18n.translate('console.variablesPage.variablesTable.columns.variableHeader', {
        defaultMessage: 'Variable name',
      }),
      'data-test-subj': 'variableNameCell',
      render: (name: string) => {
        return <EuiCode>{`\$\{${name}\}`}</EuiCode>;
      },
    },
    {
      field: 'value',
      name: i18n.translate('console.variablesPage.variablesTable.columns.valueHeader', {
        defaultMessage: 'Value',
      }),
      'data-test-subj': 'variableValueCell',
      render: (value: string) => <EuiCode>{value}</EuiCode>,
    },
    {
      field: 'id',
      name: '',
      width: '40px',
      isExpander: true,
      render: (id: string, variable: DevToolsVariable) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            iconType={itemIdToExpandedRowMapValues[id] ? 'arrowUp' : 'pencil'}
            aria-label={i18n.translate('console.variablesPage.variablesTable.columns.editButton', {
              defaultMessage: 'Edit {variable}',
              values: { variable: variable.name },
            })}
            color="primary"
            onClick={() => toggleDetails(id)}
            data-test-subj="variableEditButton"
          />
        );
      },
    },
    {
      field: 'id',
      name: '',
      width: '40px',
      render: (id: string, variable: DevToolsVariable) => (
        <EuiButtonIcon
          iconType="trash"
          aria-label={i18n.translate('console.variablesPage.variablesTable.columns.deleteButton', {
            defaultMessage: 'Delete {variable}',
            values: { variable: variable.name },
          })}
          color="danger"
          onClick={() => setDeleteModalForVariable(id)}
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
          <FormattedMessage
            id="console.variablesPage.pageDescription"
            defaultMessage="Define reusable placeholders for dynamic values in your queries."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiBasicTable
        items={variables}
        columns={columns}
        itemId="id"
        responsiveBreakpoint={false}
        className="conVariablesTable"
        data-test-subj="variablesTable"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        noItemsMessage={i18n.translate('console.variablesPage.table.noItemsMessage', {
          defaultMessage: 'No variables have been added yet',
        })}
      />

      {isAddingVariable && (
        <VariableEditorForm onSubmit={onAddVariable} onCancel={() => setIsAddingVariable(false)} />
      )}

      <EuiSpacer size="m" />

      <div>
        <EuiButton
          data-test-subj="variablesAddButton"
          iconType="plusInCircle"
          onClick={() => {
            setIsAddingVariable(true);
            collapseExpandedRows();
          }}
          disabled={isAddingVariable}
        >
          <FormattedMessage
            id="console.variablesPage.addButtonLabel"
            defaultMessage="Add variable"
          />
        </EuiButton>
      </div>

      {deleteModalForVariable && (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          title={i18n.translate('console.variablesPage.deleteModal.title', {
            defaultMessage: 'Are you sure?',
          })}
          onCancel={() => setDeleteModalForVariable(null)}
          onConfirm={() => deleteVariable(deleteModalForVariable)}
          cancelButtonText={i18n.translate('console.variablesPage.deleteModal.cancelButtonText', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('console.variablesPage.deleteModal.confirmButtonText', {
            defaultMessage: 'Delete variable',
          })}
          buttonColor="danger"
        >
          <p>
            <FormattedMessage
              id="console.variablesPage.deleteModal.description"
              defaultMessage="Deleting a variable is irreversible."
            />
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
