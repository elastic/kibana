/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, EuiSuperSelect, EuiTextColor } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { TypeIcon } from '../../../components';
import { useWorkflowsUiServices } from '../../../context';
import { useConnectors, useInvalidateConnectors } from '../../hooks/use_connectors';

/**
 * Sentinel option value for the "Create a new connector" entry. Connector IDs
 * are saved-object UUIDs, so this cannot collide with a real connector.
 */
const CREATE_NEW_VALUE = '__workflows-library-create-connector__';

const LABEL = i18n.translate('workflows.library.installForm.connectorAriaLabel', {
  defaultMessage: 'Select a connector',
});

export interface ConnectorFieldProps {
  /** The action type the picker is scoped to (`InstallFormField['connectorType']`). */
  connectorType: string;
  /** Selected connector ID. */
  value: string | undefined;
  onChange: (connectorId: string) => void;
  isInvalid?: boolean;
  'data-test-subj'?: string;
}

/**
 * Connector picker for `inputType: connector` install-form fields: lists the
 * user's existing connectors of the required type, with a final "Create a new
 * connector" entry that opens the actions plugin's connector-creation flyout
 * (via the `triggersActionsUi` start contract from `WorkflowsUiServicesProvider`).
 * A newly created connector is selected automatically.
 */
export const ConnectorField = React.memo<ConnectorFieldProps>(function ConnectorField({
  connectorType,
  value,
  onChange,
  isInvalid,
  'data-test-subj': dataTestSubj,
}) {
  const { triggersActionsUi } = useWorkflowsUiServices();
  const { data: connectors, isLoading } = useConnectors(connectorType);
  const invalidateConnectors = useInvalidateConnectors();
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);

  const options = useMemo(
    () => [
      ...(connectors ?? []).map((connector) => ({
        value: connector.id,
        inputDisplay: connector.name,
        'data-test-subj': `${dataTestSubj}-option-${connector.id}`,
      })),
      {
        value: CREATE_NEW_VALUE,
        inputDisplay: createNewLabel,
        dropdownDisplay: (
          <EuiTextColor color="accent">
            <EuiIcon type="plusInCircle" size="s" aria-hidden={true} />
            &nbsp;
            {createNewLabel}
          </EuiTextColor>
        ),
        'data-test-subj': `${dataTestSubj}-createNew`,
      },
    ],
    [connectors, dataTestSubj]
  );

  const createConnectorFlyout = useMemo(() => {
    if (!isCreateFlyoutOpen) {
      return null;
    }
    return triggersActionsUi.getAddConnectorFlyout({
      initialConnector: { actionTypeId: connectorType },
      onClose: () => setIsCreateFlyoutOpen(false),
      onConnectorCreated: (createdConnector: ActionConnector) => {
        void invalidateConnectors();
        onChange(createdConnector.id);
        setIsCreateFlyoutOpen(false);
      },
    });
  }, [isCreateFlyoutOpen, triggersActionsUi, connectorType, invalidateConnectors, onChange]);

  return (
    <>
      <EuiSuperSelect
        // Same resolution as the catalog step icons (extensions registry →
        // connector specs → action-type registry), so the picker shows the
        // connector type's real logo.
        prepend={<TypeIcon type={connectorType} kind="step" size="m" />}
        options={options}
        valueOfSelected={value}
        onChange={(selected) => {
          if (selected === CREATE_NEW_VALUE) {
            setIsCreateFlyoutOpen(true);
            return;
          }
          onChange(selected);
        }}
        isLoading={isLoading}
        isInvalid={isInvalid}
        placeholder={LABEL}
        fullWidth
        compressed
        data-test-subj={dataTestSubj}
        aria-label={LABEL}
      />
      {createConnectorFlyout}
    </>
  );
});
ConnectorField.displayName = 'ConnectorField';

const createNewLabel = i18n.translate('workflows.library.installForm.createNewConnector', {
  defaultMessage: 'Create a new connector',
});
