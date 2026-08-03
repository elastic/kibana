import React from 'react';
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
export declare const ConnectorField: React.NamedExoticComponent<ConnectorFieldProps>;
