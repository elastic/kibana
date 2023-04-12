/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationServices } from '../../types';

export const getServicesMock = (): NavigationServices => {
  const recentItems = [{ label: 'This is a test', id: 'test', link: 'legendOfZelda' }];
  const navigateToUrl = jest.fn().mockResolvedValue(undefined);
  const basePath = { prepend: jest.fn((path: string) => `/base${path}`) };
  const getLocator = jest.fn();
  const registerNavItemClick = jest.fn();

  return {
    activeNavItemId: 'test.hello.lamp',
    basePath,
    getLocator,
    navIsOpen: true,
    navigateToUrl,
    recentItems,
    registerNavItemClick,
  };
};
