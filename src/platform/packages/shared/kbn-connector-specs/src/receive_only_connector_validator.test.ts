/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReceiveOnlyConnectorValidator } from './receive_only_connector_validator';

describe('createReceiveOnlyConnectorValidator', () => {
  const validate = createReceiveOnlyConnectorValidator('Datadog');

  it('accepts no authentication with every action turned off', () => {
    expect(validate({ selectedActions: [] }, { authType: 'none' })).toBeNull();
  });

  it.each([
    ['unset', {}],
    ['null (all actions)', { selectedActions: null }],
    ['a selection', { selectedActions: ['listMonitors'] }],
  ])('rejects no authentication when selectedActions is %s', (_label, config) => {
    expect(validate(config, { authType: 'none' })).toBe(
      'A Datadog connector with no authentication can only receive events. Set selectedActions to an empty list, or add credentials.'
    );
  });

  it('accepts any action selection with credentials', () => {
    expect(validate({ selectedActions: null }, { authType: 'basic' })).toBeNull();
    expect(validate({ selectedActions: ['listMonitors'] }, { authType: 'basic' })).toBeNull();
  });
});
