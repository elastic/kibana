/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';
import { Datadog } from './specs/datadog/datadog';
import { InboundWebhook } from './specs/inbound_webhook/inbound_webhook';
import { Slack } from './specs/slack/slack';
import { withReceiveOnlyAuth } from './with_receive_only_auth';

const authTypeId = (authType: string | { type: string }): string =>
  typeof authType === 'string' ? authType : authType.type;

describe('withReceiveOnlyAuth', () => {
  it('appends none for Datadog and reuses that spec', () => {
    const first = withReceiveOnlyAuth(Datadog);
    const second = withReceiveOnlyAuth(Datadog);

    expect(first).toBe(second);
    expect(first).not.toBe(Datadog);
    expect(first.auth?.types.map(authTypeId)).toEqual(['basic', 'none']);
  });

  it('leaves a Datadog spec that already lists none unchanged', () => {
    const spec: ConnectorSpec = {
      ...Datadog,
      auth: {
        ...Datadog.auth,
        types: [...(Datadog.auth?.types ?? []), 'none'],
      },
    };

    expect(withReceiveOnlyAuth(spec)).toBe(spec);
  });

  it('leaves a dual spec that is not opted in unchanged', () => {
    expect(withReceiveOnlyAuth(Slack)).toBe(Slack);
    expect(Slack.auth?.types.map(authTypeId)).not.toContain('none');
  });

  it('leaves an inbound-only spec unchanged', () => {
    expect(withReceiveOnlyAuth(InboundWebhook)).toBe(InboundWebhook);
  });

  it('leaves an outbound spec unchanged even when its id is opted in', () => {
    const outbound: ConnectorSpec = {
      ...Datadog,
      events: undefined,
    };

    expect(withReceiveOnlyAuth(outbound)).toBe(outbound);
  });
});
