/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connectorTypeIsDual, isDualConnectorSpec } from './is_dual_connector_spec';
import { InboundWebhook } from './specs/inbound_webhook/inbound_webhook';
import { Unifi } from './specs/unifi/unifi';
import { createTestDualConnectorSpec } from './test/create_test_dual_connector_spec';

describe('isDualConnectorSpec', () => {
  it('is false for .inboundWebhook', () => {
    expect(isDualConnectorSpec(InboundWebhook)).toBe(false);
  });

  it('is false for an outbound spec', () => {
    expect(isDualConnectorSpec(Unifi)).toBe(false);
  });

  it('is true for a spec with actions and events', () => {
    expect(isDualConnectorSpec(createTestDualConnectorSpec())).toBe(true);
  });
});

describe('connectorTypeIsDual', () => {
  it('is false for .inboundWebhook', () => {
    expect(connectorTypeIsDual('.inboundWebhook')).toBe(false);
  });

  it('is false for an unknown type', () => {
    expect(connectorTypeIsDual('.not-a-spec')).toBe(false);
  });
});
