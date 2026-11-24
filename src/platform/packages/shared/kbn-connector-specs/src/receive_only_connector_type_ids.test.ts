/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATADOG_CONNECTOR_TYPE_ID } from './specs/datadog/constants';
import { SERVICENOW_SEARCH_CONNECTOR_TYPE_ID } from './specs/servicenow_search/constants';
import { SLACK_CONNECTOR_TYPE_ID } from './specs/slack/constants';
import {
  RECEIVE_ONLY_CONNECTOR_TYPE_IDS,
  connectorTypeSupportsReceiveOnly,
} from './receive_only_connector_type_ids';

describe('receive-only connector type ids', () => {
  it('opts in Datadog only', () => {
    expect(RECEIVE_ONLY_CONNECTOR_TYPE_IDS).toEqual([DATADOG_CONNECTOR_TYPE_ID]);
    expect(connectorTypeSupportsReceiveOnly(DATADOG_CONNECTOR_TYPE_ID)).toBe(true);
    expect(connectorTypeSupportsReceiveOnly(SLACK_CONNECTOR_TYPE_ID)).toBe(false);
    expect(connectorTypeSupportsReceiveOnly('.github')).toBe(false);
    expect(connectorTypeSupportsReceiveOnly(SERVICENOW_SEARCH_CONNECTOR_TYPE_ID)).toBe(false);
  });
});
