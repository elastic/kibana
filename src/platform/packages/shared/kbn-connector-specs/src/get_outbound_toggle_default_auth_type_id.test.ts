/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthTypeDef, ConnectorSpec } from './connector_spec';
import { getOutboundToggleDefaultAuthTypeId } from './get_outbound_toggle_default_auth_type_id';

const createSpec = ({
  authTypes,
  hasEvents = true,
  hasActions = true,
}: {
  authTypes: Array<string | AuthTypeDef>;
  hasEvents?: boolean;
  hasActions?: boolean;
}): ConnectorSpec =>
  ({
    metadata: { id: '.test' },
    auth: { types: authTypes },
    actions: hasActions ? { listItems: {} } : {},
    ...(hasEvents ? { events: { definitions: { item: {} }, handleEvents: jest.fn() } } : {}),
    test: { enabled: false, handler: jest.fn() },
  } as unknown as ConnectorSpec);

describe('getOutboundToggleDefaultAuthTypeId', () => {
  it('returns the first credentialed auth type for a dual connector that offers none', () => {
    expect(
      getOutboundToggleDefaultAuthTypeId(
        createSpec({ authTypes: [{ type: 'basic', defaults: {} }, 'bearer', 'none'] })
      )
    ).toBe('basic');
  });

  it.each([
    ['no spec', undefined],
    ['no none auth type', createSpec({ authTypes: ['basic'] })],
    ['only the none auth type', createSpec({ authTypes: ['none'] })],
    ['no events', createSpec({ authTypes: ['basic', 'none'], hasEvents: false })],
    ['no actions', createSpec({ authTypes: ['basic', 'none'], hasActions: false })],
  ])('returns undefined with %s', (_label, spec) => {
    expect(getOutboundToggleDefaultAuthTypeId(spec)).toBeUndefined();
  });
});
