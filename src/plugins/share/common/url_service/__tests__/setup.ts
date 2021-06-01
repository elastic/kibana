/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import { LocatorDefinition } from '../locators';
import { UrlService, UrlServiceDependencies } from '../url_service';

export interface TestLocatorState extends SerializableState {
  savedObjectId: string;
  showFlyout: boolean;
  pageNumber: number;
}

export const testLocator: LocatorDefinition<TestLocatorState> = {
  id: 'TEST_LOCATOR',
  getLocation: async ({ savedObjectId, pageNumber, showFlyout }) => {
    return {
      app: 'test_app',
      route: `/my-object/${savedObjectId}?page=${pageNumber}`,
      state: {
        isFlyoutOpen: showFlyout,
      },
    };
  },
};

export const urlServiceTestSetup = (partialDeps: Partial<UrlServiceDependencies> = {}) => {
  const deps: UrlServiceDependencies = {
    navigate: async () => {
      throw new Error('not implemented');
    },
    ...partialDeps,
  };
  const service = new UrlService(deps);

  return { service, deps };
};
