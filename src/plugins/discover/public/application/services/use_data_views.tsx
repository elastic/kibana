/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { DataView, IndexPattern } from '../../../../data_views/common';
import { DiscoverServices } from '../../build_services';

export interface DiscoverDataViewEntry {
  id: string;
  title: string;
  tmp?: boolean;
  timeFieldName?: string;
  dataView?: DataView;
}

export function useDataViews(
  services: DiscoverServices,
  dataViewId: string = '',
  dataViewTimefield: string = ''
) {
  const list = useRef<DiscoverDataViewEntry[]>([]);
  const [dataView, setDataView] = useState<IndexPattern>();

  const loadList = useCallback(async () => {
    const newList: DiscoverDataViewEntry[] = [];
    const idTitleList = await services.data.dataViews.getIdsWithTitle();
    for (const entry of idTitleList) {
      newList.push({ id: entry.id, title: entry.title });
    }
    newList.sort((a, b) => (a.title > b.title ? 1 : -1));
    list.current = newList;
    return newList;
  }, [services.data.dataViews]);

  const getList = useCallback(async () => {
    if (list.current.length) {
      return list.current;
    }
    return await loadList();
  }, [list, loadList]);

  const get = useCallback(
    async (index: string, timefield: string = '') => {
      if (!index) {
        return;
      }
      const usedList = await getList();
      if (usedList.find((item) => item.id === index)) {
        return await services.data.dataViews.get(index);
      }

      const newDataView = await services.data.dataViews.create({
        id: index,
        title: index,
        timeFieldName: timefield,
      });
      newDataView.tmp = true;
      return newDataView;
    },
    [getList, services]
  );

  useEffect(() => {
    loadList();
  }, [services.data.dataViews, loadList]);

  const getPersisted = useCallback(
    async (newDataView) => {
      if (!newDataView.tmp) {
        return newDataView;
      }
      return await services.data.dataViews.createAndSave({
        id: newDataView.id,
        title: newDataView.title,
        timeFieldName: newDataView.timefield,
      });
    },
    [services.data.dataViews]
  );

  useEffect(() => {
    const load = async () => {
      const newDataView = await get(dataViewId, dataViewTimefield);
      setDataView(newDataView);
    };
    if (dataViewId) {
      load();
    }
  }, [get, dataViewId, setDataView, dataViewTimefield]);
  return { getList, get, dataView, list: list.current, getPersisted };
}
