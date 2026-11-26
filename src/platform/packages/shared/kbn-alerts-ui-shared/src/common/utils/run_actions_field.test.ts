/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RUN_ACTIONS_FIELD_PATH, isRunActionsOff } from './run_actions_field';

const formWithFields = (fields: Record<string, { value: unknown }>) => ({
  getFields: () => fields,
});

describe('isRunActionsOff', () => {
  it('is false when the form has no Run actions switch', () => {
    expect(isRunActionsOff(formWithFields({ 'secrets.authType': { value: 'basic' } }))).toBe(false);
  });

  it('is false when Run actions is on', () => {
    expect(isRunActionsOff(formWithFields({ [RUN_ACTIONS_FIELD_PATH]: { value: true } }))).toBe(
      false
    );
  });

  it('is true when Run actions is off', () => {
    expect(isRunActionsOff(formWithFields({ [RUN_ACTIONS_FIELD_PATH]: { value: false } }))).toBe(
      true
    );
  });
});
