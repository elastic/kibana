/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import type { LocatorDefinition, UrlService } from 'src/plugins/share/common/url_service';
import { BrowserUrlService } from '../browser_url_service';

export interface BrowserTestLocatorState extends SerializableState {
  savedObjectId: string;
  showFlyout: boolean;
  pageNumber: number;
}

export const browserTestLocator: LocatorDefinition<BrowserTestLocatorState> = {
  id: 'BROWSER_TEST_LOCATOR',
  getLocation: ({ savedObjectId, pageNumber, showFlyout }) => {
    return {
      app: 'test_app',
      route: `/my-object/${savedObjectId}?page=${pageNumber}`,
      state: {
        isFlyoutOpen: showFlyout,
      },
    };
  },
};

export const urlServiceTestSetup = (): UrlService => {
  const urlService = new BrowserUrlService();
  return urlService;
};
