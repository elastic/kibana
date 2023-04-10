/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { getLocatorNavigation } from '../../src/services';
import { NavigationServices } from '../../types';

export const getServicesMock = (): NavigationServices => {
  const locatorNavigation = getLocatorNavigation(jest.fn(), jest.fn());
  const recentItems = [{ label: 'This is a test', id: 'test', link: 'legendOfZelda' }];

  return {
    locatorNavigation,
    activeNavItemId$: new BehaviorSubject('test.hello.lamp'),
    navIsOpen: true,
    recentItems,
  };
};
