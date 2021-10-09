/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useRef } from 'react';
import { DataView, DataViewListItem } from '../../../../data_views/common';
import { DiscoverServices } from '../../build_services';
import { showConfirmPanel } from './use_data_views_confirm_panel';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface UseDataViewsReturn {
  getList: () => Promise<DataViewListItem[]>;
  get: (index: string, timefield: string) => Promise<undefined | DataView>;
  dataView?: DataView;
  list?: DataViewListItem[];
  getPersisted: (dataView: DataView) => Promise<DataView>;
  isTemporary: (dataView: DataView) => Promise<boolean>;
}

export function useDataViews(services: DiscoverServices): UseDataViewsReturn {
  const list = useRef<DataViewListItem[]>([]);

  const loadList = useCallback(async () => {
    const idTitleList = await services.data.dataViews.getIdsWithTitle();
    list.current = idTitleList.sort((a, b) => (a.title > b.title ? 1 : -1));
    return list.current;
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

      return await services.data.dataViews.create({
        id: index,
        title: index,
        timeFieldName: timefield,
      });
    },
    [getList, services]
  );

  useEffect(() => {
    loadList();
  }, [services.data.dataViews, loadList]);

  const isTemporary = useCallback(
    async (checkDataView: DataView) => {
      const persisted = await getList();
      return !persisted.find((item) => item.id === checkDataView.id);
    },
    [getList]
  );

  const getPersisted = useCallback(
    async (newDataView: DataView): Promise<DataView> => {
      if (!(await isTemporary(newDataView))) {
        return newDataView;
      }

      return new Promise((resolve, reject) => {
        showConfirmPanel({
          I18nContext: services.core.i18n.Context,
          onConfirm: async () => {
            const newPersistedDataView = await services.data.dataViews.createAndSave({
              id: newDataView.id,
              title: newDataView.title,
              timeFieldName: newDataView.timeFieldName,
            });
            resolve(newPersistedDataView);
          },
          onCancel: () => reject(),
        });
      });
    },
    [isTemporary, services.core.i18n.Context, services.data.dataViews]
  );
  return { getList, get, list: list.current, getPersisted, isTemporary };
}
