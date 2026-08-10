/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getHollowBadgeHtml } from '../get_stability_note';

export const UNAVAILABLE_CONNECTOR_ACTION_LABEL = i18n.translate(
  'workflows.workflowYamlEditor.autocomplete.connectorActionUnavailableLabel',
  {
    defaultMessage: 'Unavailable',
  }
);

export const getUnavailableConnectorActionMessage = (connectorName: string): string =>
  i18n.translate('workflows.workflowYamlEditor.autocomplete.connectorActionUnavailableMessage', {
    defaultMessage:
      'This action is not available for connector "{connectorName}" with its current credentials.',
    values: { connectorName },
  });

export const getUnavailableConnectorActionBadgeHtml = (): string =>
  getHollowBadgeHtml(UNAVAILABLE_CONNECTOR_ACTION_LABEL);
