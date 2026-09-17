/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { isInboundOnlyConnectorSpec } from '@kbn/connector-specs';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import type { RehydratedConnectorSpecCatalogEntry } from '../../common/connector_specs_catalog';
import { getConnectorEventTriggerDefinitions } from '../../common/triggers/connector_event_triggers';

export { toConnectorEventTriggerSchema } from '../../common/triggers/connector_event_triggers';

export interface RegisterConnectorEventTriggersParams {
  inboundEventsEnabled: boolean;
  registerTriggerDefinition: (definition: ServerTriggerDefinition) => void;
  specs: ConnectorSpec[];
}

export const connectorSpecToCatalogEntry = (
  spec: ConnectorSpec
): RehydratedConnectorSpecCatalogEntry => ({
  id: spec.metadata.id,
  isInboundOnly: isInboundOnlyConnectorSpec(spec),
  actions: Object.fromEntries(
    Object.entries(spec.actions).map(([name, action]) => [
      name,
      {
        ...(action.description !== undefined ? { description: action.description } : {}),
        ...(action.isTool !== undefined ? { isTool: action.isTool } : {}),
        input: action.input,
      },
    ])
  ),
  ...(spec.events ? { events: { definitions: Object.values(spec.events.definitions) } } : {}),
});

/**
 * Publishes `spec.events` as Workflows triggers when inbound events are enabled.
 */
export function registerConnectorEventTriggers({
  inboundEventsEnabled,
  registerTriggerDefinition,
  specs,
}: RegisterConnectorEventTriggersParams): void {
  const definitions = getConnectorEventTriggerDefinitions({
    inboundEventsEnabled,
    specs: specs.map(connectorSpecToCatalogEntry),
  });
  for (const definition of definitions) {
    registerTriggerDefinition(definition);
  }
}
