/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLazyFlyoutContainerFromParent } from './get_lazy_flyout_container';

describe('getLazyFlyoutContainerFromParent', () => {
  it('returns null when parentApi is undefined', () => {
    expect(getLazyFlyoutContainerFromParent(undefined)).toBeNull();
  });

  it('returns the element from getLazyFlyoutContainer', () => {
    const element = document.createElement('div');
    expect(
      getLazyFlyoutContainerFromParent({
        getLazyFlyoutContainer: () => element,
      })
    ).toBe(element);
  });

  it('returns null when getLazyFlyoutContainer is missing', () => {
    expect(getLazyFlyoutContainerFromParent({})).toBeNull();
  });
});
