/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DiscoverMainStateParams } from './use_root_breadcrumb';
import { useDiscoverServices } from './use_discover_services';

/**
 * Needed to only get adhoc data view from cache if exists.
 */
const tryGetAdHocDataView = async (dataViews: DataViewsContract, dataViewId: string) => {
  try {
    return await dataViews.get(dataViewId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
};

export const useDataView = ({
  dataViewId,
  locationState,
}: {
  dataViewId: string;
  locationState?: DiscoverMainStateParams;
}) => {
  const { dataViews } = useDiscoverServices();
  const [dataView, setDataView] = useState<DataView>();
  const [error, setError] = useState<Error>();

  const resolveDataView = useCallback(async () => {
    const dataViewSpec = locationState?.index;

    try {
      if (typeof dataViewSpec === 'object' && dataViewSpec.id === dataViewId) {
        // try get adhoc data view from cache
        let adhocDataView = await tryGetAdHocDataView(dataViews, dataViewId);
        if (!adhocDataView) {
          // create adhoc data view from spec
          adhocDataView = await dataViews.create(dataViewSpec);
        }
        setDataView(adhocDataView);
      } else {
        // try load saved data view
        setDataView(await dataViews.get(dataViewId));
      }
    } catch (e) {
      setError(e);
    }
  }, [dataViewId, dataViews, locationState]);

  useEffect(() => {
    resolveDataView();
  }, [resolveDataView]);

  return { dataView, error };
};
