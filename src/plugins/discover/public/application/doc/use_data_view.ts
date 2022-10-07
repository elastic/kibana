/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useState } from 'react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export const useDataView = ({
  dataViewId,
  dataViewSpec,
}: {
  dataViewId: string;
  dataViewSpec?: DataViewSpec;
}) => {
  const { dataViews } = useDiscoverServices();
  const [dataView, setDataView] = useState<DataView>();
  const [error, setError] = useState();

  useEffect(() => {
    async function loadDataView() {
      try {
        let item: DataView;
        if (dataViewSpec && dataViewSpec.id === dataViewId) {
          item = await dataViews.create(dataViewSpec);
        } else {
          item = await dataViews.get(dataViewId);
        }
        setDataView(item);
      } catch (e) {
        setError(e);
      }
    }
    loadDataView();
  }, [dataViewId, dataViewSpec, dataViews]);
  return { dataView, error };
};
