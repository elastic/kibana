/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connectorsSpecs, INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs';
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

describe('GitHub connector triggers', () => {
  it('registers named triggers that require a connector instance', () => {
    const triggers = getConnectorEventTriggerDefinitions({
      inboundEventsEnabled: true,
      specs: [connectorsSpecs.GithubConnector],
    });
    expect(triggers.map(({ id }) => id)).toEqual([
      'github.issues',
      'github.issue_comment',
      'github.pull_request',
      'github.pull_request_review',
      'github.push',
      'github.release',
      'github.deployment_status',
      'github.check_run',
    ]);
    for (const trigger of triggers) {
      expect(trigger.requiresConnectorId).toBe(true);
      expect(getConnectorTypeIdForTriggerEventId(trigger.id)).toBe('.github');
    }
  });

  it('retains vendor fields when the trigger schema adds connector identity', () => {
    const trigger = getConnectorEventTriggerDefinitions({
      inboundEventsEnabled: true,
      specs: [connectorsSpecs.GithubConnector],
    }).find(({ id }) => id === 'github.pull_request');
    const payload = {
      eventType: 'pull_request',
      body: { action: 'closed', pull_request: { number: 42, merged: true, custom: 'kept' } },
      connectorId: 'github-1',
      connectorTypeId: '.github',
      spaceId: 'default',
      correlationKey: 'delivery-1',
    };
    expect(trigger?.eventSchema.parse(payload)).toEqual(payload);
  });
});
