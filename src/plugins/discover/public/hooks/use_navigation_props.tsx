/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { disableFilter, type Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useHistory } from 'react-router-dom';
import { useDiscoverServices } from './use_discover_services';

export interface UseNavigationProps {
  dataView: DataView;
  rowIndex: string;
  rowId: string;
  columns: string[];
  savedSearchId?: string;
  // provided by embeddable only
  filters?: Filter[];
}

export const useNavigationProps = ({
  dataView,
  rowIndex,
  rowId,
  columns,
  savedSearchId,
  filters,
}: UseNavigationProps) => {
  const isEmbeddableView = !useHistory();
  const services = useDiscoverServices();

  const onOpenSingleDoc = useCallback(
    (event) => {
      event.preventDefault();

      services.singleDocLocator.navigate({
        dataViewSpec: dataView.toSpec(false),
        rowId,
        rowIndex,
      });
    },
    [dataView, rowId, rowIndex, services.singleDocLocator]
  );

  const onOpenSurrDocs = useCallback(() => {
    event?.preventDefault?.();

    let appliedFilters: Filter[] = [];
    if (!isEmbeddableView) {
      // applied from discover main and context app
      appliedFilters = [
        ...services.filterManager.getGlobalFilters(),
        ...services.filterManager.getAppFilters(),
      ];
    } else if (isEmbeddableView && filters?.length) {
      // applied from embeddable
      appliedFilters = filters;
    }

    services.contextLocator.navigate({
      dataViewSpec: dataView.toSpec(false),
      rowId,
      columns,
      filters: appliedFilters.map(disableFilter),
      savedSearchId,
    });
  }, [
    columns,
    dataView,
    filters,
    isEmbeddableView,
    rowId,
    savedSearchId,
    services.contextLocator,
    services.filterManager,
  ]);

  return { onOpenSingleDoc, onOpenSurrDocs };
};
