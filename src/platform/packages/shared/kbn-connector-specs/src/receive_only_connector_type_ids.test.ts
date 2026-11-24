/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';
import { DATADOG_CONNECTOR_TYPE_ID } from './specs/datadog/constants';
import { Datadog } from './specs/datadog/datadog';
import { InboundWebhook } from './specs/inbound_webhook/inbound_webhook';
import { SERVICENOW_SEARCH_CONNECTOR_TYPE_ID } from './specs/servicenow_search/constants';
import { SLACK_CONNECTOR_TYPE_ID } from './specs/slack/constants';
import { Slack } from './specs/slack/slack';
import {
  RECEIVE_ONLY_CONNECTOR_TYPE_IDS,
  connectorTypeSupportsReceiveOnly,
  specSupportsReceiveOnly,
} from './receive_only_connector_type_ids';

describe('receive-only connector type ids', () => {
  it('opts in Datadog only', () => {
    expect(RECEIVE_ONLY_CONNECTOR_TYPE_IDS).toEqual([DATADOG_CONNECTOR_TYPE_ID]);
    expect(connectorTypeSupportsReceiveOnly(DATADOG_CONNECTOR_TYPE_ID)).toBe(true);
    expect(connectorTypeSupportsReceiveOnly(SLACK_CONNECTOR_TYPE_ID)).toBe(false);
    expect(connectorTypeSupportsReceiveOnly('.github')).toBe(false);
    expect(connectorTypeSupportsReceiveOnly(SERVICENOW_SEARCH_CONNECTOR_TYPE_ID)).toBe(false);
  });

  it('requires a dual spec whose id is opted in', () => {
    const outbound: ConnectorSpec = {
      ...Datadog,
      events: undefined,
    };

    expect(specSupportsReceiveOnly(Datadog)).toBe(true);
    expect(specSupportsReceiveOnly(Slack)).toBe(false);
    expect(specSupportsReceiveOnly(InboundWebhook)).toBe(false);
    expect(specSupportsReceiveOnly(outbound)).toBe(false);
  });
});
