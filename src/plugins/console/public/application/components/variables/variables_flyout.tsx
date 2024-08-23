/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import { VariableForm } from './variable_form';
import * as utils from './utils';
import { type DevToolsVariable } from './utils';

export interface DevToolsVariablesFlyoutProps {
  onSaveVariables: (newVariables: DevToolsVariable[]) => void;
  variables: [];
}

export const DevToolsVariablesFlyout = (props: DevToolsVariablesFlyoutProps) => {
  const isMounted = useRef(false);
  const [isAddingVariable, setIsAddingVariable] = useState(false);
  const [deleteModalForVariable, setDeleteModalForVariable] = useState<string | null>(null);
  const [variables, setVariables] = useState<DevToolsVariable[]>(props.variables);
  const deleteModalTitleId = useGeneratedHtmlId();

  // Use a ref to persist the BehaviorSubject across renders
  const itemIdToExpandedRowMap$ = useRef(new BehaviorSubject<Record<string, React.ReactNode>>({}));
  // Subscribe to the BehaviorSubject and update local state on change
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, React.ReactNode>>({});
  // Subscribe to the BehaviorSubject on mount
  useEffect(() => {
    const subscription = itemIdToExpandedRowMap$.current.subscribe(setItemIdToExpandedRowMap);
    return () => subscription.unsubscribe();
  }, []);

  const collapseExpandedRow = (variableId: string) => {
    const updatedMap = itemIdToExpandedRowMap$.current.getValue();

    if (updatedMap[variableId]) {
      delete updatedMap[variableId];
      itemIdToExpandedRowMap$.current.next({ ...updatedMap });
    }
  };

  // Always save variables when they change
  useEffect(() => {
    if (isMounted.current) {
      props.onSaveVariables(variables);
    } else {
      isMounted.current = true;
    }
  }, [variables]);

  const toggleDetails = (variableId: string) => {
    const currentMap = itemIdToExpandedRowMap$.current.getValue();
    const itemIdToExpandedRowMapValues = { ...currentMap };

    if (itemIdToExpandedRowMapValues[variableId]) {
      delete itemIdToExpandedRowMapValues[variableId];
    } else {
      itemIdToExpandedRowMapValues[variableId] = (
        <VariableForm
          title={i18n.translate('console.variablesPage.editVariableForm.title', { defaultMessage: 'Edit variable' })}
          onSubmit={(data: DevToolsVariable) => {
            const updatedVariables = utils.editVariable(
              data,
              variables
            );
            setVariables(updatedVariables);
            collapseExpandedRow(variableId);
          }}
          onCancel={() => {
            collapseExpandedRow(variableId);
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
      render: (name: string) => {
        return (
          <EuiCode>{`\$\{${name}\}`}</EuiCode>
        );
      },
    },
    {
      field: 'value',
      name: i18n.translate('console.variablesPage.variablesTable.columns.valueHeader', {
        defaultMessage: 'Value',
      }),
      render: (value: string) => (
        <EuiCode>{value}</EuiCode>
      ),
    },
    {
      field: 'id',
      name: '',
      width: '40px',
      isExpander: true,
      render: (id: string) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            iconType={itemIdToExpandedRowMapValues[id] ? 'arrowUp' : 'pencil'}
            aria-label="Edit"
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
      render: (id: string) => (
        <EuiButtonIcon
          iconType="trash"
          aria-label="Delete"
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
          <FormattedMessage id="console.variablesPage.pageDescription" defaultMessage="Define and reuse placeholders for dynamic values in your queries." />
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiBasicTable
        items={variables}
        columns={columns}
        itemId="id"
        className="conVariablesTable"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        noItemsMessage={i18n.translate('console.variablesPage.table.noItemsMessage', {
          defaultMessage: 'No variables have been added yet',
        })}
      />

      {isAddingVariable && (
        <VariableForm
          onSubmit={onAddVariable}
          onCancel={() => setIsAddingVariable(false)}
        />
      )}

      <EuiSpacer size="m" />

      <div>
        <EuiButton
          data-test-subj="variablesAddButton"
          iconType="plusInCircle"
          onClick={() => setIsAddingVariable(true)}
          disabled={isAddingVariable}
        >
          <FormattedMessage id="console.variablesPage.addButtonLabel" defaultMessage="Add variable" />
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
          cancelButtonText="Cancel"
          confirmButtonText="Delete variable"
          buttonColor="danger"
        >
          <p>
            <FormattedMessage id="console.variablesPage.deleteModal.description" defaultMessage="Deleting a variable cannot be reverted." />
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
