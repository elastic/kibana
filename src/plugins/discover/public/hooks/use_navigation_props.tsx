/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { disableFilter, Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from './use_discover_services';

export interface UseNavigationProps {
  dataView: DataView;
  rowIndex: string;
  rowId: string;
  columns: string[];
  // provided for embeddable only
  filters?: Filter[];
}

export const useNavigationProps = ({
  dataView,
  rowIndex,
  rowId,
  columns,
  filters,
}: UseNavigationProps) => {
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

    let appliedFilters = filters || [];
    if (!filters) {
      appliedFilters = [
        ...services.filterManager.getGlobalFilters(),
        ...services.filterManager.getAppFilters(),
      ];
    }

    services.contextLocator.navigate({
      dataViewSpec: dataView.toSpec(false),
      rowId,
      columns,
      filters: appliedFilters.map(disableFilter),
    });
  }, [columns, dataView, filters, rowId, services.contextLocator, services.filterManager]);

  return { onOpenSingleDoc, onOpenSurrDocs };
};
