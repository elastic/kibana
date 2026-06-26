/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNavigationNodeIcon } from './get_navigation_node_icon';

describe('getNavigationNodeIcon', () => {
  it('uses the navigation icon instead of the solution logo for home nodes in the customization modal', () => {
    expect(
      getNavigationNodeIcon(
        {
          id: 'observability-overview',
          renderAs: 'home',
          icon: 'logoObservability',
          deepLink: { euiIconType: 'logoObservability' },
        },
        { forCustomizationModal: true }
      )
    ).toBe('home');
  });

  it('keeps logo icons for home nodes in the side navigation', () => {
    expect(
      getNavigationNodeIcon({
        id: 'observability-overview',
        renderAs: 'home',
        icon: 'logoObservability',
        deepLink: { euiIconType: 'logoObservability' },
      })
    ).toBe('logoObservability');
  });

  it('keeps non-logo icons for regular nodes', () => {
    expect(
      getNavigationNodeIcon({
        id: 'discover',
        icon: 'productDiscover',
      })
    ).toBe('productDiscover');
  });
});
