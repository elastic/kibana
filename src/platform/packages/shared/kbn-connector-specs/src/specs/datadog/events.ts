/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConnectorIngressContext,
  ConnectorSpecEvents,
  HandleEventsResult,
} from '../../connector_spec_events';
import { DATADOG_ALERT_EVENT_ID, DATADOG_ALERT_EVENT_KEY } from './constants';
import { DatadogReceivedEventSchema } from './types';

const hasAlertIdentity = (
  rawBody: unknown
): rawBody is Record<'monitor_id' | 'scopes', unknown> => {
  if (typeof rawBody !== 'object' || rawBody === null || Array.isArray(rawBody)) {
    return false;
  }

  const { monitor_id: monitorId, scopes } = rawBody as Record<string, unknown>;
  return monitorId !== undefined && monitorId !== null && scopes !== undefined && scopes !== null;
};

const handleDatadogEvents = async (ctx: ConnectorIngressContext): Promise<HandleEventsResult> => {
  if (!hasAlertIdentity(ctx.rawBody)) {
    return { type: 'emit', events: [] };
  }

  return {
    type: 'emit',
    events: [
      {
        eventId: DATADOG_ALERT_EVENT_ID,
        correlationKey: uuidv4(),
        payload: {
          body: ctx.rawBody,
        },
      },
    ],
  };
};

export const datadogEvents: ConnectorSpecEvents = {
  definitions: {
    [DATADOG_ALERT_EVENT_KEY]: {
      eventId: DATADOG_ALERT_EVENT_ID,
      title: i18n.translate('connectorSpecs.datadog.events.alert.title', {
        defaultMessage: 'Alert',
      }),
      description: i18n.translate('connectorSpecs.datadog.events.alert.description', {
        defaultMessage: 'A Datadog alert webhook payload was accepted on the connector ingest URL.',
      }),
      eventSchema: DatadogReceivedEventSchema,
    },
  },
  handleEvents: handleDatadogEvents,
};
