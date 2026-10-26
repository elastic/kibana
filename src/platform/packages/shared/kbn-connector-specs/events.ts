/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Packaged inbound event definitions and schemas. Does not load the bundled specs barrel.
 */

import type { ConnectorSpecEvents } from './src/connector_spec_events';
import { DATADOG_CONNECTOR_TYPE_ID } from './src/specs/datadog/constants';
import { datadogEvents } from './src/specs/datadog/events';
import { githubEvents } from './src/specs/github/events';
import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from './src/specs/inbound_webhook/constants';
import { inboundWebhookEvents } from './src/specs/inbound_webhook/events';
import { MICROSOFT_TEAMS_CONNECTOR_TYPE_ID } from './src/specs/microsoft_teams/constants';
import { microsoftTeamsEvents } from './src/specs/microsoft_teams/events';
import { SERVICENOW_SEARCH_CONNECTOR_TYPE_ID } from './src/specs/servicenow_search/constants';
import { servicenowSearchEvents } from './src/specs/servicenow_search/events';
import { SLACK_CONNECTOR_TYPE_ID } from './src/specs/slack/constants';
import { slackEvents } from './src/specs/slack/events';

export type { ConnectorSpecEvents, EventDefinition } from './src/connector_spec_events';

export type PackagedConnectorEvents = Readonly<Record<string, ConnectorSpecEvents>>;

export const packagedConnectorEvents: PackagedConnectorEvents = {
  [DATADOG_CONNECTOR_TYPE_ID]: datadogEvents,
  // No connector type id constant exists. Must match buildEventId('.github', ...) in github/events.ts.
  '.github': githubEvents,
  [INBOUND_WEBHOOK_CONNECTOR_TYPE_ID]: inboundWebhookEvents,
  [MICROSOFT_TEAMS_CONNECTOR_TYPE_ID]: microsoftTeamsEvents,
  [SERVICENOW_SEARCH_CONNECTOR_TYPE_ID]: servicenowSearchEvents,
  [SLACK_CONNECTOR_TYPE_ID]: slackEvents,
};

export const getPackagedConnectorEvents = (
  connectorTypeId: string
): ConnectorSpecEvents | undefined => packagedConnectorEvents[connectorTypeId];
