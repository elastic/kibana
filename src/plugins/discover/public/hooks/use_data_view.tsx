/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from './use_discover_services';

export const useDataView = ({ dataViewId }: { dataViewId: string }) => {
  const { dataViews } = useDiscoverServices();
  const [dataView, setDataView] = useState<DataView>();
  const [error, setError] = useState<Error>();

  const resolveDataView = useCallback(async () => {
    try {
      setDataView(await dataViews.get(dataViewId));
    } catch (e) {
      setError(e);
    }
  }, [dataViewId, dataViews]);

  useEffect(() => {
    resolveDataView();
  }, [resolveDataView]);

  return { dataView, error };
};
