/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useState } from 'react';
import { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';

export const useDataView = (dataViews: DataViewsContract, dataViewId: string) => {
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);
  const [error, setError] = useState();

  useEffect(() => {
    async function loadDataView() {
      try {
        const item = await dataViews.get(dataViewId);
        setDataView(item);
      } catch (e) {
        setError(e);
      }
    }
    loadDataView();
  }, [dataViewId, dataViews]);
  return { dataView, error };
};
