/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  AlertEventSchema,
  DocumentEventSchema,
  WORKFLOWS_ALERT_EVENT_TYPE,
  WORKFLOWS_DOCUMENT_EVENT_TYPE,
} from '@kbn/workflows';
import type { ManualWorkflowEventDefinition } from './manual_workflow_event_registry';

export const alertManualWorkflowEventDefinition: ManualWorkflowEventDefinition<
  typeof AlertEventSchema
> = {
  id: WORKFLOWS_ALERT_EVENT_TYPE,
  eventSchema: AlertEventSchema,
  title: i18n.translate('workflowsExtensions.manualWorkflowEvents.alert.title', {
    defaultMessage: 'Alert',
  }),
  description: i18n.translate('workflowsExtensions.manualWorkflowEvents.alert.description', {
    defaultMessage: 'Runs manually against one or more alerts.',
  }),
};

export const documentManualWorkflowEventDefinition: ManualWorkflowEventDefinition<
  typeof DocumentEventSchema
> = {
  id: WORKFLOWS_DOCUMENT_EVENT_TYPE,
  eventSchema: DocumentEventSchema,
  title: i18n.translate('workflowsExtensions.manualWorkflowEvents.document.title', {
    defaultMessage: 'Document',
  }),
  description: i18n.translate('workflowsExtensions.manualWorkflowEvents.document.description', {
    defaultMessage: 'Runs manually against one or more Elasticsearch documents.',
  }),
};

export const internalManualWorkflowEventDefinitions: ManualWorkflowEventDefinition[] = [
  alertManualWorkflowEventDefinition,
  documentManualWorkflowEventDefinition,
];

interface ManualWorkflowEventRegistry {
  register(definition: ManualWorkflowEventDefinition): void;
}

export const registerInternalManualWorkflowEventDefinitions = (
  registry: ManualWorkflowEventRegistry
): void => {
  for (const definition of internalManualWorkflowEventDefinitions) {
    registry.register(definition);
  }
};
