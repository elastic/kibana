/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsService } from '../common';
import { DEFAULT_ASSETS_TO_IGNORE } from '../common/constants';

import { DataViewsServiceDeps } from '../common/data_views/data_views';

/**
 * Data Views server service dependencies
 * @public
 */
export type DataViewsServiceServerDeps = DataViewsServiceDeps;

/**
 * Data Views public service
 * @public
 */
export class DataViewsServiceServer extends DataViewsService {
  /**
   * Constructor
   * @param deps Service dependencies
   */

  constructor(deps: DataViewsServiceServerDeps) {
    super(deps);
  }
  /**
   * Returns the default data view as an object.
   * If no default is found, or it is missing
   * another data view is selected as default and returned.
   * If no possible data view found to become a default returns null.
   *
   * @returns default data view
   */
  // : Promise<DataView | null>
  async getDefaultDataView() {
    const patterns = await this.getIdsWithTitle();
    let defaultId: string | undefined = await this.config.get('defaultIndex');
    const exists = defaultId ? patterns.some((pattern) => pattern.id === defaultId) : false;

    if (defaultId && !exists) {
      await this.config.remove('defaultIndex');
      defaultId = undefined;
    }

    if (!defaultId && patterns.length >= 1 && (await this.hasUserDataView().catch(() => true))) {
      // try to set first user created data view as default,
      // otherwise fallback to any data view
      const userDataViews = patterns.filter(
        (pattern) =>
          pattern.title !== DEFAULT_ASSETS_TO_IGNORE.LOGS_INDEX_PATTERN &&
          pattern.title !== DEFAULT_ASSETS_TO_IGNORE.METRICS_INDEX_PATTERN
      );

      defaultId = userDataViews[0]?.id ?? patterns[0].id;
      await this.config.set('defaultIndex', defaultId);
    }

    if (defaultId) {
      return this.get(defaultId);
    } else {
      return null;
    }
  }
}
