/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs';
import { HITL_SLACK_ACTION_EVENT_ID } from '@kbn/workflows';
import {
  getConnectorEventTriggerDefinitions,
  getConnectorTypeIdForTriggerEventId,
} from './connector_event_triggers';

describe('getConnectorTypeIdForTriggerEventId', () => {
  it('maps inboundWebhook.received to .inboundWebhook', () => {
    expect(getConnectorTypeIdForTriggerEventId('inboundWebhook.received')).toBe(
      INBOUND_WEBHOOK_CONNECTOR_TYPE_ID
    );
  });

  it('returns undefined for built-in or unregistered trigger ids', () => {
    expect(getConnectorTypeIdForTriggerEventId('cases.updated')).toBeUndefined();
    expect(getConnectorTypeIdForTriggerEventId('manual')).toBeUndefined();
  });
});

describe('getConnectorEventTriggerDefinitions', () => {
  it('keeps slack2.hitl_action off the workflow start catalog', () => {
    const ids = getConnectorEventTriggerDefinitions({ inboundEventsEnabled: true }).map(
      (definition) => definition.id
    );

    expect(ids).toContain('slack2.message');
    expect(ids).not.toContain(HITL_SLACK_ACTION_EVENT_ID);
  });
});
