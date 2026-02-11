/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import {
  getActionTypeDisplayNameFromStepType,
  getActionTypeIdFromStepType,
} from '../../../shared/lib/action_type_utils';
import {
  getConnectorTypesFromStepType,
  isCreateConnectorEnabledForStepType,
} from '../../../shared/lib/connectors_utils';
import { getConnectorInstancesForType } from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/connector_id/get_connector_id_suggestions_items';
import {
  getCreateConnectorHoverCommandLink,
  getEditConnectorHoverCommandLink,
} from '../../../widgets/workflow_yaml_editor/lib/use_register_hover_commands';
import type { ConnectorIdItem, YamlValidationResult } from '../model/types';

const TRANSLATIONS = {
  manageConnector: i18n.translate('workflows.validateConnectorIds.manageConnectorMessage', {
    defaultMessage: 'Manage connectors',
  }),
  createConnector: i18n.translate('workflows.validateConnectorIds.createConnectorMessage', {
    defaultMessage: 'Create connector',
  }),
  editConnector: i18n.translate('workflows.validateConnectorIds.editConnectorMessage', {
    defaultMessage: 'Edit connector',
  }),
};

export function validateConnectorIds(
  connectorIdItems: ConnectorIdItem[],
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo> | null,
  connectorsManagementUrl: string
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  if (!dynamicConnectorTypes) {
    const errorResult: YamlValidationResult = {
      id: 'connector-id-validation',
      severity: 'error',
      message: 'Dynamic connector types not found',
      owner: 'connector-id-validation',
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: 0,
      endColumn: 0,
      afterMessage: null,
      beforeMessage: null,
      hoverMessage: null,
    };
    return [errorResult];
  }

  const notReferenceConnectorIds = connectorIdItems.filter(
    (item) => !item.key?.startsWith('${{') || !item.key.endsWith('}}')
  );

  for (const connectorIdItem of notReferenceConnectorIds) {
    const stepType = connectorIdItem.connectorType;

    const connectorType = dynamicConnectorTypes[stepType];
    const displayName =
      connectorType?.displayName ?? getActionTypeDisplayNameFromStepType(stepType);
    const instances = getConnectorInstancesForType(stepType, dynamicConnectorTypes);

    const instance = instances.find((ins) => ins.id === connectorIdItem.key);
    // Create insert position at the start of the connector-id value
    const insertPosition = {
      lineNumber: connectorIdItem.startLineNumber,
      column: connectorIdItem.startColumn,
    };

    const manageConnectorLink = `[${TRANSLATIONS.manageConnector}](${connectorsManagementUrl})`;

    if (!instance) {
      const actions: string[] = [];
      if (isCreateConnectorEnabledForStepType(stepType)) {
        const resolvedConnectorType = getConnectorTypesFromStepType(stepType)[0];
        const createConnectorLink = getCreateConnectorHoverCommandLink({
          text: TRANSLATIONS.createConnector,
          connectorType: getActionTypeIdFromStepType(resolvedConnectorType),
          insertPosition,
        });
        actions.push(createConnectorLink);
      }
      actions.push(manageConnectorLink);

      const errorResult: YamlValidationResult = {
        id: connectorIdItem.id,
        severity: 'error',
        message: i18n.translate('workflows.validateConnectorIds.connectorNotFoundMessage', {
          defaultMessage:
            '{displayName} connector UUID "{id}" not found.\nCreate a new connector or choose an existing one\n',
          values: { displayName, id: connectorIdItem.key },
        }),
        owner: 'connector-id-validation',
        startLineNumber: connectorIdItem.startLineNumber,
        startColumn: connectorIdItem.startColumn,
        endLineNumber: connectorIdItem.endLineNumber,
        endColumn: connectorIdItem.endColumn,
        beforeMessage: null,
        hoverMessage: actions.join(' | '),
      };
      results.push(errorResult);
    } else {
      const actions: string[] = [];
      actions.push(
        getEditConnectorHoverCommandLink({
          text: TRANSLATIONS.editConnector,
          connectorType: instance.connectorType,
          connectorId: instance.id,
        })
      );
      if (isCreateConnectorEnabledForStepType(stepType)) {
        actions.push(
          getCreateConnectorHoverCommandLink({
            text: TRANSLATIONS.createConnector,
            connectorType: instance.connectorType,
            insertPosition,
          })
        );
      }
      actions.push(manageConnectorLink);

      const connectedMessage = i18n.translate(
        'workflows.validateConnectorIds.connectorFoundMessage',
        {
          defaultMessage: `Successfully connected to {displayName} connector "{name}"`,
          values: { displayName, name: instance.name },
        }
      );
      const uuidMessage = `Connector uuid: <code>${instance.id}</code>`;
      const actionsMessage = actions.join(' | ');

      const validResult: YamlValidationResult = {
        id: connectorIdItem.id,
        severity: 'info',
        message: null,
        owner: 'connector-id-validation',
        startLineNumber: connectorIdItem.startLineNumber,
        startColumn: connectorIdItem.startColumn,
        endLineNumber: connectorIdItem.endLineNumber,
        endColumn: connectorIdItem.endColumn,
        beforeMessage: `✓ ${instance.name}`,
        hoverMessage: `${connectedMessage}\n\n${uuidMessage}\n\n${actionsMessage}`,
      };
      results.push(validResult);
    }
  }

  return results;
}
