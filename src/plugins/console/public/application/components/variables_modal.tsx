/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useForm, Controller, useWatch, SubmitHandler } from 'react-hook-form';

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

import type { DevToolsVariable, Variables } from '../../services';
import { generateDefaultVariable } from '../../services';

interface Props {
  onClose: () => void;
  onSaveVariables: (newVariables: DevToolsVariable[]) => void;
  variablesService: Variables;
}

interface FormProps {
  variables: DevToolsVariable[];
}

export function DevToolsVariablesModal({ onClose, onSaveVariables, variablesService }: Props) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormProps>({
    defaultValues: {
      variables: variablesService.toJSON(),
    },
  });
  const formId = useGeneratedHtmlId({ prefix: '__console' });
  const variables = useWatch({
    control,
    name: 'variables',
  });

  const addNewVariable = () => {
    setValue('variables', [...variables, generateDefaultVariable()]);
  };

  const deleteVariable = (id: string) => {
    const updatedVariables = variables.filter((v) => v.id !== id);
    setValue('variables', updatedVariables);
  };

  const onSubmit: SubmitHandler<FormProps> = (data) => {
    onSaveVariables(data.variables);
  };

  const columns: Array<EuiBasicTableColumn<DevToolsVariable>> = [
    {
      field: 'name',
      name: i18n.translate('console.variablesPage.variablesTable.columns.variableHeader', {
        defaultMessage: 'Variable',
      }),
      render: (variable, item) => {
        const index = variables.findIndex((v) => v.id === item.id);
        const isInvalid = (errors.variables && Boolean(errors?.variables[index])) ?? false;
        const textField = (
          <Controller
            control={control}
            defaultValue={variable}
            rules={{ required: true, pattern: /^[A-Za-z]+$/i }}
            render={({ field }) => (
              <EuiFieldText
                placeholder="Add a new variable"
                fullWidth
                {...field}
                isInvalid={isInvalid}
              />
            )}
            name={`variables.${index}.name`}
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
      render: (value, item) => {
        const index = variables.findIndex((v) => v.id === item.id);
        const textField = (
          <Controller
            control={control}
            defaultValue={value}
            render={({ field }) => <EuiFieldText fullWidth {...field} />}
            name={`variables.${index}.value`}
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
          />
        );
        return <>{button}</>;
      },
    },
  ];

  return (
    <EuiModal data-test-subj="devToolsVariablesModal" onClose={onClose} style={{ width: 800 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="console.variablesPage.pageTitle"
            defaultMessage="Console Variables"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm id={formId} component="form" onSubmit={handleSubmit(onSubmit)}>
          <EuiBasicTable items={variables} columns={columns} />
          <EuiButtonEmpty iconType="plus" onClick={addNewVariable}>
            <FormattedMessage id="console.variablesPage.addButtonLabel" defaultMessage="Add" />
          </EuiButtonEmpty>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="variablesCancelButton" onClick={onClose}>
          <FormattedMessage id="console.variablesPage.cancelButtonLabel" defaultMessage="Cancel" />
        </EuiButtonEmpty>

        <EuiButton fill data-test-subj="variables-save-button" type="submit" form={formId}>
          <FormattedMessage id="console.variablesPage.saveButtonLabel" defaultMessage="Save" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
