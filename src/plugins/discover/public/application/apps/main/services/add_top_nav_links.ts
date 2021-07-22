/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DiscoverTopNavProps } from '../components/top_nav/discover_topnav';
import type { TopNavMenuData } from '../../../../../../navigation/public';

/**
 * Async callback function that generates a TopNavMenuData object
 * given the arguments provided
 */
export type AddNavLinkCallback = (params: DiscoverTopNavProps) => Promise<TopNavMenuData>;

/**
 * Service for other plugins to register additional links or actions
 * within Discover (e.g. top navigation bar)
 */
export class AddDataService {
  private TopNavMenuDatas: Record<string, AddNavLinkCallback> = {};

  public setup() {
    return {
      /**
       * Registers an async callback function that will return a valid top nav link action
       */
      registerTopNavLinks: (id: string, callbackFn: AddNavLinkCallback) => {
        if (this.TopNavMenuDatas[id]) {
          throw new Error(`link ${id} already exists`);
        }
        this.TopNavMenuDatas[id] = callbackFn;
      },
    };
  }

  public getTopNavMenuDatas() {
    return Object.values(this.TopNavMenuDatas);
  }
}

export type AddDataServiceSetup = ReturnType<AddDataService['setup']>;
