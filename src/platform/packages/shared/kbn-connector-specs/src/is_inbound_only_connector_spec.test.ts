/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  connectorTypeIsInboundOnly,
  isInboundOnlyConnectorSpec,
} from './is_inbound_only_connector_spec';
import { InboundWebhook } from './specs/inbound_webhook/inbound_webhook';
import { Unifi } from './specs/unifi/unifi';
import { createTestDualConnectorSpec } from './test/create_test_dual_connector_spec';

describe('isInboundOnlyConnectorSpec', () => {
  it('is true for .inboundWebhook', () => {
    expect(isInboundOnlyConnectorSpec(InboundWebhook)).toBe(true);
  });

  it('is false for an outbound spec', () => {
    expect(isInboundOnlyConnectorSpec(Unifi)).toBe(false);
  });

  it('is false for a dual spec with actions and events', () => {
    expect(isInboundOnlyConnectorSpec(createTestDualConnectorSpec())).toBe(false);
  });
});

describe('connectorTypeIsInboundOnly', () => {
  it('is true for .inboundWebhook', () => {
    expect(connectorTypeIsInboundOnly('.inboundWebhook')).toBe(true);
  });

  it('is false for an unknown type', () => {
    expect(connectorTypeIsInboundOnly('.not-a-spec')).toBe(false);
  });
});
