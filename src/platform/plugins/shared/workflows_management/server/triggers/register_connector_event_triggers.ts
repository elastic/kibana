/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connectorSpecHasEvents, connectorsSpecs } from '@kbn/connector-specs';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { i18n } from '@kbn/i18n';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';

type ConnectorSpecWithEvents = ConnectorSpec & {
  events: NonNullable<ConnectorSpec['events']>;
};

const isConnectorSpecWithEvents = (spec: ConnectorSpec): spec is ConnectorSpecWithEvents =>
  connectorSpecHasEvents(spec);

/**
 * Hub/bridge fields always present on connector-event payloads at emit time.
 * Spec `eventSchema` is the spoke mapping only (e.g. `body`); Workflows must
 * accept the enriched object or `emitEvent` validation rejects the event.
 */
export const toConnectorEventTriggerSchema = (specEventSchema: z.ZodObject): z.ZodObject =>
  specEventSchema.extend({
    connectorId: z.string().describe(
      i18n.translate('workflowsManagement.triggers.connectorEvent.connectorIdDescription', {
        defaultMessage: 'Id of the connector instance that received this event.',
      })
    ),
    connectorTypeId: z.string().describe(
      i18n.translate('workflowsManagement.triggers.connectorEvent.connectorTypeIdDescription', {
        defaultMessage: 'Connector type id (for example .inboundWebhook).',
      })
    ),
    spaceId: z.string().describe(
      i18n.translate('workflowsManagement.triggers.connectorEvent.spaceIdDescription', {
        defaultMessage: 'Kibana space of the connector instance.',
      })
    ),
    correlationKey: z
      .string()
      .optional()
      .describe(
        i18n.translate('workflowsManagement.triggers.connectorEvent.correlationKeyDescription', {
          defaultMessage: 'Optional correlation key supplied by the connector for this ingest.',
        })
      ),
  });

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
  specs = Object.values(connectorsSpecs),
}: RegisterConnectorEventTriggersParams): void {
  if (!inboundEventsEnabled) {
    return;
  }

  const eventDefinitions = specs
    .filter(isConnectorSpecWithEvents)
    .flatMap((spec) => Object.values(spec.events.definitions));

  for (const eventDefinition of eventDefinitions) {
    registerTriggerDefinition({
      id: eventDefinition.eventId,
      title: eventDefinition.title,
      description: eventDefinition.description,
      eventSchema: toConnectorEventTriggerSchema(eventDefinition.eventSchema),
      stability: 'tech_preview',
    });
  }
}
