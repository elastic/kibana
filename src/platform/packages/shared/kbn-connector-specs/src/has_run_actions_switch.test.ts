/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthTypeDef, ConnectorSpec } from './connector_spec';
import { hasRunActionsSwitch } from './has_run_actions_switch';

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

describe('hasRunActionsSwitch', () => {
  it('is true for a dual connector with a credentialed auth type and none', () => {
    expect(
      hasRunActionsSwitch(
        createSpec({ authTypes: [{ type: 'basic', defaults: {} }, 'bearer', 'none'] })
      )
    ).toBe(true);
  });

  it('is true for a dual connector that does not list none', () => {
    expect(hasRunActionsSwitch(createSpec({ authTypes: ['basic'] }))).toBe(true);
  });

  it.each([
    ['no spec', undefined],
    ['only the none auth type', createSpec({ authTypes: ['none'] })],
    ['no events', createSpec({ authTypes: ['basic', 'none'], hasEvents: false })],
    ['no actions', createSpec({ authTypes: ['basic', 'none'], hasActions: false })],
  ])('is false with %s', (_label, spec) => {
    expect(hasRunActionsSwitch(spec)).toBe(false);
  });
});
