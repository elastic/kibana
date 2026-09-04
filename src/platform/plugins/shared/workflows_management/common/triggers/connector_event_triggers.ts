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
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
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

export const getConnectorEventTriggerDefinitions = ({
  inboundEventsEnabled,
  specs = Object.values(connectorsSpecs),
}: {
  inboundEventsEnabled: boolean;
  specs?: ConnectorSpec[];
}): CommonTriggerDefinition[] => {
  if (!inboundEventsEnabled) {
    return [];
  }

  return specs.filter(isConnectorSpecWithEvents).flatMap((spec) =>
    Object.values(spec.events.definitions).map((eventDefinition) => ({
      id: eventDefinition.eventId,
      title: eventDefinition.title,
      description: eventDefinition.description,
      eventSchema: toConnectorEventTriggerSchema(eventDefinition.eventSchema),
      stability: 'tech_preview' as const,
      requiresConnectorId: true,
    }))
  );
};

/**
 * Maps a connector-event trigger id (e.g. `inboundWebhook.received`) to the
 * connector type id used for instance lookup (e.g. `.inboundWebhook`).
 */
export const getConnectorTypeIdForTriggerEventId = (
  eventId: string,
  specs: ConnectorSpec[] = Object.values(connectorsSpecs)
): string | undefined => {
  const spec = specs
    .filter(isConnectorSpecWithEvents)
    .find((candidate) =>
      Object.values(candidate.events.definitions).some(
        (eventDefinition) => eventDefinition.eventId === eventId
      )
    );
  return spec?.metadata.id;
};
