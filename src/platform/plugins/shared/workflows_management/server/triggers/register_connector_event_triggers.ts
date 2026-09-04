/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import { getConnectorEventTriggerDefinitions } from '../../common/triggers/connector_event_triggers';

export { toConnectorEventTriggerSchema } from '../../common/triggers/connector_event_triggers';

export interface RegisterConnectorEventTriggersParams {
  inboundEventsEnabled: boolean;
  registerTriggerDefinition: (definition: ServerTriggerDefinition) => void;
  specs?: ConnectorSpec[];
}

/**
 * Publishes `spec.events` as Workflows triggers when inbound events are enabled.
 */
export function registerConnectorEventTriggers({
  inboundEventsEnabled,
  registerTriggerDefinition,
  specs,
}: RegisterConnectorEventTriggersParams): void {
  const definitions = getConnectorEventTriggerDefinitions({ inboundEventsEnabled, specs });
  for (const definition of definitions) {
    registerTriggerDefinition(definition);
  }
}
