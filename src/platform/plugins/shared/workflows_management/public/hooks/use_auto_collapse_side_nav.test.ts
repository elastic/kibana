/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useAutoCollapseSideNav } from './use_auto_collapse_side_nav';
import { createStartServicesMock } from '../mocks';
import { getTestProvider } from '../shared/mocks/test_providers';

describe('useAutoCollapseSideNav', () => {
  const setup = (isCollapsed: boolean) => {
    const services = createStartServicesMock();
    const { sideNav } = services.chrome;
    jest.mocked(sideNav.getIsCollapsed).mockReturnValue(isCollapsed);
    return {
      sideNav,
      ...renderHook(() => useAutoCollapseSideNav(), { wrapper: getTestProvider({ services }) }),
    };
  };

  it('collapses an expanded side nav and expands it again on unmount', () => {
    const { sideNav, unmount } = setup(false);
    expect(sideNav.setIsCollapsed).toHaveBeenLastCalledWith(true);

    unmount();
    expect(sideNav.setIsCollapsed).toHaveBeenLastCalledWith(false);
  });

  it('expands the side nav again when the page unloads', () => {
    const { sideNav } = setup(false);

    window.dispatchEvent(new Event('pagehide'));
    expect(sideNav.setIsCollapsed).toHaveBeenLastCalledWith(false);
  });

  it('leaves a side nav the user already collapsed unchanged', () => {
    const { sideNav, unmount } = setup(true);
    unmount();
    expect(sideNav.setIsCollapsed).not.toHaveBeenCalled();
  });
});
