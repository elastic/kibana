/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AlertEventSchema,
  DocumentEventSchema,
  WORKFLOWS_ALERT_EVENT_TYPE,
  WORKFLOWS_DOCUMENT_EVENT_TYPE,
} from '@kbn/workflows';
import {
  alertManualWorkflowEventDefinition,
  documentManualWorkflowEventDefinition,
  registerInternalManualWorkflowEventDefinitions,
} from './generic_manual_workflow_event_definitions';

describe('generic manual workflow event definitions', () => {
  it('uses stable IDs and the shared event schemas', () => {
    expect(WORKFLOWS_ALERT_EVENT_TYPE).toBe('workflows.alert');
    expect(WORKFLOWS_DOCUMENT_EVENT_TYPE).toBe('workflows.document');
    expect(alertManualWorkflowEventDefinition).toEqual(
      expect.objectContaining({
        id: WORKFLOWS_ALERT_EVENT_TYPE,
        eventSchema: AlertEventSchema,
      })
    );
    expect(documentManualWorkflowEventDefinition).toEqual(
      expect.objectContaining({
        id: WORKFLOWS_DOCUMENT_EVENT_TYPE,
        eventSchema: DocumentEventSchema,
      })
    );
  });

  it('registers both definitions', () => {
    const registry = { register: jest.fn() };

    registerInternalManualWorkflowEventDefinitions(registry);

    expect(registry.register.mock.calls).toEqual([
      [alertManualWorkflowEventDefinition],
      [documentManualWorkflowEventDefinition],
    ]);
  });
});
