/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionMatcher, EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiIcon, useGeneratedHtmlId } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { getCachedInferenceConnectorInstances } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import {
  clearCreatedConnector,
  openCreateConnectorFlyout,
  selectLastCreatedConnector,
} from '../../../entities/workflows/store';
import { getActionTypeIdFromStepType } from '../../../shared/lib/action_type_utils';
import {
  getConnectorTypesFromStepType,
  isCreateConnectorEnabledForStepType,
} from '../../../shared/lib/connectors_utils';
import {
  getConnectorInstanceLabel,
  getConnectorInstancesForType,
} from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/connector_id/get_connector_id_suggestions_items';
import type { StepFormField } from '../lib/step_form_schema';

/** Value of the entry that opens the create-connector flyout; it is never written to the step. */
const CREATE_CONNECTOR_VALUE = '__workflowsCreateConnector__';

/**
 * The others match on name or id. The create entry shows only while nothing is typed: once there is
 * text, it would be the one match left and Enter would open the flyout instead of accepting the
 * text as the value.
 */
const matchOption: EuiComboBoxOptionMatcher<string> = ({ option, normalizedSearchValue }) =>
  option.value === CREATE_CONNECTOR_VALUE
    ? normalizedSearchValue === ''
    : option.label.toLowerCase().includes(normalizedSearchValue);

export interface ConnectorIdFieldProps {
  readonly field: StepFormField;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly isInvalid: boolean;
  readonly onBlur: () => void;
  readonly testSubj: string;
}

/**
 * The `connector-id` of a step: pick one of the connectors that fit the step type (written as its
 * id), type any other text, or create a connector. A created connector comes back through the
 * store, under this field's request id, and is taken as the value.
 */
export function ConnectorIdField({
  field,
  value,
  onChange,
  isInvalid,
  onBlur,
  testSubj,
}: ConnectorIdFieldProps) {
  const stepType = field.stepType ?? '';
  const dispatch = useDispatch();
  const connectors = useAvailableConnectors();
  const requestId = useGeneratedHtmlId({ prefix: 'workflowConnectorIdField' });
  const lastCreated = useSelector(selectLastCreatedConnector);

  // The connector this field asked for has been created: take its id.
  useEffect(() => {
    if (lastCreated?.requestId !== requestId) return;
    onChange(lastCreated.id);
    dispatch(clearCreatedConnector());
  }, [lastCreated, requestId, onChange, dispatch]);

  const canCreate = isCreateConnectorEnabledForStepType(stepType);
  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    const instances = getConnectorInstancesForType(
      stepType,
      connectors?.connectorTypes,
      getCachedInferenceConnectorInstances()
    );
    // A copy: for inference steps `instances` is the module cache itself, which must not be sorted.
    const connectorOptions = [...instances]
      // Deprecated connectors last, as in the YAML editor.
      .sort(
        (a, b) =>
          Number(Boolean(a.isDeprecated)) - Number(Boolean(b.isDeprecated)) ||
          a.name.localeCompare(b.name)
      )
      .map((instance) => ({ label: getConnectorInstanceLabel(instance), value: instance.id }));
    return canCreate
      ? [
          ...connectorOptions,
          {
            label: i18n.translate('workflows.stepConfigPanel.connectorId.create', {
              defaultMessage: 'Create connector',
            }),
            value: CREATE_CONNECTOR_VALUE,
            prepend: <EuiIcon type="plusCircle" size="s" aria-hidden="true" />,
          },
        ]
      : connectorOptions;
  }, [stepType, connectors?.connectorTypes, canCreate]);

  const stored = value === undefined || value === null ? '' : String(value);
  const selectedOptions: Array<EuiComboBoxOptionOption<string>> =
    stored === ''
      ? []
      : [options.find((option) => option.value === stored) ?? { label: stored, value: stored }];

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const option = selected[0];
    if (!option) {
      onChange(undefined);
      return;
    }
    if (option.value === CREATE_CONNECTOR_VALUE) {
      dispatch(
        openCreateConnectorFlyout({
          connectorType: getActionTypeIdFromStepType(getConnectorTypesFromStepType(stepType)[0]),
          requestId,
        })
      );
      return;
    }
    onChange(option.value);
  };

  return (
    <EuiComboBox<string>
      aria-label={field.label}
      placeholder={i18n.translate('workflows.stepConfigPanel.connectorId.placeholder', {
        defaultMessage: 'Select a connector or type an ID',
      })}
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      optionMatcher={matchOption}
      onChange={handleChange}
      onCreateOption={(text) => {
        const trimmed = text.trim();
        if (trimmed !== '') onChange(trimmed);
      }}
      isClearable={!field.required}
      compressed
      fullWidth
      isInvalid={isInvalid}
      onBlur={onBlur}
      data-test-subj={testSubj}
    />
  );
}
