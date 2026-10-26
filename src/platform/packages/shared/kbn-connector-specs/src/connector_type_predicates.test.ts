/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from './all_specs';
import {
  connectorTypeHasInboundEvents,
  connectorTypeIsDual,
  connectorTypeIsInboundOnly,
  connectorTypePublishesKeys,
} from './connector_type_predicates';
import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from './specs/inbound_webhook/constants';

describe('connectorTypeHasInboundEvents', () => {
  it('is true for .inboundWebhook', () => {
    expect(connectorTypeHasInboundEvents(INBOUND_WEBHOOK_CONNECTOR_TYPE_ID)).toBe(true);
  });

  it('is false for outbound specs and unknown types', () => {
    expect(connectorTypeHasInboundEvents('.http')).toBe(false);
    expect(connectorTypeHasInboundEvents('my-connector-type')).toBe(false);
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

describe('connectorTypeIsDual', () => {
  it('is false for .inboundWebhook', () => {
    expect(connectorTypeIsDual('.inboundWebhook')).toBe(false);
  });

  it('is false for an unknown type', () => {
    expect(connectorTypeIsDual('.not-a-spec')).toBe(false);
  });
});

describe('connectorTypePublishesKeys', () => {
  const signingSpec = Object.values(connectorsSpecs).find((spec) => spec.signingKey !== undefined);

  if (signingSpec) {
    it('is true for a spec that declares signingKey', () => {
      expect(connectorTypePublishesKeys(signingSpec.metadata.id)).toBe(true);
    });
  } else {
    it.skip('is true for a spec that declares signingKey', () => {});
  }

  it('is false for an unknown id', () => {
    expect(connectorTypePublishesKeys('.not-a-spec')).toBe(false);
  });
});
