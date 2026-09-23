/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  getConnectorEventTriggerDefinitions,
  getConnectorTypeIdForTriggerEventId,
} from '../../common/triggers/connector_event_triggers';

const connectorEventTriggerIcon = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/plugs').then(({ icon }) => ({ default: icon }))
);

/**
 * Connector-event triggers share the connector's mark (for example the Datadog
 * logo). Specs without a brand icon keep the generic plugs glyph.
 */
function resolveConnectorEventTriggerIcon(
  eventId: string,
  specs?: ConnectorSpec[]
): React.ComponentType {
  const connectorTypeId = getConnectorTypeIdForTriggerEventId(eventId, specs);
  const specIcon = connectorTypeId ? ConnectorIconsMap.get(connectorTypeId) : undefined;
  return specIcon ?? connectorEventTriggerIcon;
}

export interface RegisterConnectorEventTriggersPublicParams {
  inboundEventsEnabled: boolean;
  registerTriggerDefinition: (definition: PublicTriggerDefinition) => void;
  specs?: ConnectorSpec[];
}

/**
 * Publishes `spec.events` to the editor trigger catalog when inbound events are enabled.
 */
export function registerConnectorEventTriggersPublic({
  inboundEventsEnabled,
  registerTriggerDefinition,
  specs,
}: RegisterConnectorEventTriggersPublicParams): void {
  const definitions = getConnectorEventTriggerDefinitions({ inboundEventsEnabled, specs });
  for (const definition of definitions) {
    registerTriggerDefinition({
      ...definition,
      icon: resolveConnectorEventTriggerIcon(definition.id, specs),
    });
  }
}
