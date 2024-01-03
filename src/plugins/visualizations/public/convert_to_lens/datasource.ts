/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

export const getDataViewByIndexPatternId = async (
  indexPatternId: string | undefined,
  dataViews: DataViewsPublicPluginStart
) => {
  try {
    return indexPatternId
      ? await dataViews.getLegacy(indexPatternId)
      : (async () => {
          const defaultDataView = await dataViews.getDefault();
          return defaultDataView ? await dataViews.toDataView(defaultDataView) : null;
        })();
  } catch (err) {
    return null;
  }
};
