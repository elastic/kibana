/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';

/** Extends a spoke event schema with the hub fields published on the bus. */
export const connectorEventSchema = <TShape extends z.ZodRawShape>(
  eventSchema: z.ZodObject<TShape>
) =>
  eventSchema.extend({
    connectorId: z.string().describe(
      i18n.translate('connectorTopics.connectorEvent.connectorIdDescription', {
        defaultMessage: 'Id of the connector instance that received this event.',
      })
    ),
    connectorTypeId: z.string().describe(
      i18n.translate('connectorTopics.connectorEvent.connectorTypeIdDescription', {
        defaultMessage: 'Connector type id (for example .inboundWebhook).',
      })
    ),
    spaceId: z.string().describe(
      i18n.translate('connectorTopics.connectorEvent.spaceIdDescription', {
        defaultMessage: 'Kibana space of the connector instance.',
      })
    ),
    correlationKey: z
      .string()
      .optional()
      .describe(
        i18n.translate('connectorTopics.connectorEvent.correlationKeyDescription', {
          defaultMessage: 'Optional correlation key supplied by the connector for this ingest.',
        })
      ),
  });
