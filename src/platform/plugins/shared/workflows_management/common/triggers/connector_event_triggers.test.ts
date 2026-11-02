/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  connectorSpecHasEvents,
  connectorsSpecs,
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
} from '@kbn/connector-specs';
import type { ConnectorSpec } from '@kbn/connector-specs';
import {
  getConnectorEventTriggerDefinitions,
  getConnectorTypeIdForTriggerEventId,
} from './connector_event_triggers';

/** Same rule as trigger titles: drop a trailing ` (v2)` from the connector catalog name. */
const connectorTriggerDisplayName = (displayName: string): string =>
  displayName.replace(/ \(v\d+\)$/, '');

const expectedConnectorEventTitles = (specs: ConnectorSpec[]): Map<string, string> =>
  new Map(
    specs.filter(connectorSpecHasEvents).flatMap((spec) => {
      const events = spec.events;
      if (!events) {
        return [];
      }
      const displayName = connectorTriggerDisplayName(spec.metadata.displayName);
      return Object.values(events.definitions).map(
        (eventDefinition) =>
          [eventDefinition.eventId, `${displayName} - ${eventDefinition.title}`] as const
      );
    })
  );

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
  it('returns no triggers when inbound events are disabled', () => {
    expect(getConnectorEventTriggerDefinitions({ inboundEventsEnabled: false })).toEqual([]);
  });

  it('prefixes each event title with the connector display name', () => {
    const specs = Object.values(connectorsSpecs);
    const definitions = getConnectorEventTriggerDefinitions({ inboundEventsEnabled: true, specs });
    const expected = expectedConnectorEventTitles(specs);

    expect(expected.size).toBeGreaterThan(0);
    expect(new Map(definitions.map((definition) => [definition.id, definition.title]))).toEqual(
      expected
    );
  });
});
