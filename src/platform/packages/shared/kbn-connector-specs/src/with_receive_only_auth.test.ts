/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';
import { InboundWebhook } from './specs/inbound_webhook/inbound_webhook';
import { createTestDualConnectorSpec } from './test/create_test_dual_connector_spec';
import { withReceiveOnlyAuth } from './with_receive_only_auth';

const createSpec = (overrides: Partial<ConnectorSpec>): ConnectorSpec =>
  createTestDualConnectorSpec({ auth: { types: ['basic'] }, ...overrides });

const authTypeId = (authType: string | { type: string }): string =>
  typeof authType === 'string' ? authType : authType.type;

describe('withReceiveOnlyAuth', () => {
  it('appends none for a dual spec and reuses that spec', () => {
    const spec = createSpec({});
    const first = withReceiveOnlyAuth(spec);
    const second = withReceiveOnlyAuth(spec);

    expect(first).toBe(second);
    expect(first).not.toBe(spec);
    expect(first.auth?.types.map(authTypeId)).toEqual(['basic', 'none']);
  });

  it('leaves a dual spec that already lists none unchanged', () => {
    const spec = createSpec({ auth: { types: ['basic', 'none'] } });

    expect(withReceiveOnlyAuth(spec)).toBe(spec);
  });

  it('leaves an inbound-only spec unchanged', () => {
    expect(withReceiveOnlyAuth(InboundWebhook)).toBe(InboundWebhook);
  });

  it('leaves an outbound spec unchanged', () => {
    const spec = createSpec({ events: undefined });

    expect(withReceiveOnlyAuth(spec)).toBe(spec);
  });
});
