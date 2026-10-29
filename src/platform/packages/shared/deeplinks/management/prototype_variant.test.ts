/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getDataManagementPrototypeVariant,
  setDataManagementPrototypeVariant,
  subscribeDataManagementPrototypeVariant,
} from './prototype_variant';

describe('data management prototype variant', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('defaults to v1 and keeps the selected variant in this tab', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeDataManagementPrototypeVariant(listener);

    expect(getDataManagementPrototypeVariant()).toBe('v1');

    setDataManagementPrototypeVariant('v2');

    expect(getDataManagementPrototypeVariant()).toBe('v2');
    expect(listener).toHaveBeenCalledWith('v2');

    unsubscribe();
    setDataManagementPrototypeVariant('v1');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
