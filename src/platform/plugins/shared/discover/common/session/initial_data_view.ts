/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DiscoverDataSource } from '../data_sources';
import { isDataViewSource } from '../data_sources';

/** Selects the requested ID from app state, the saved document, or the restored view. */
export const getInitialDataViewId = ({
  dataSource,
  documentDataViewId,
  restoredDataViewId,
}: {
  dataSource: DiscoverDataSource | undefined;
  documentDataViewId?: string;
  restoredDataViewId?: string;
}): string | undefined => {
  if (isDataViewSource(dataSource)) {
    return dataSource.dataViewId;
  }

  return documentDataViewId ?? restoredDataViewId;
};

/** Keeps known saved navigation views as references and other navigation views as definitions. */
export const getNavigationDataView = (
  spec: DataViewSpec | undefined,
  savedDataViewIds: readonly string[]
): DataViewSpec | string | undefined => {
  const dataViewId = spec?.id;

  if (dataViewId && savedDataViewIds.includes(dataViewId)) {
    return dataViewId;
  }

  return spec;
};

/** Selects the definition or ID to load without applying availability or error fallbacks. */
export const getRequestedDataView = ({
  dataViewId,
  navigationDataView,
  restoredDataViewSpec,
}: {
  dataViewId: string | undefined;
  navigationDataView?: DataViewSpec | string;
  restoredDataViewSpec?: DataViewSpec;
}): DataViewSpec | string | undefined => {
  if (typeof navigationDataView === 'object') {
    return navigationDataView;
  }

  // Preserve the loader's precedence: a matching local definition precedes a saved navigation ID.
  if (dataViewId && restoredDataViewSpec?.id === dataViewId) {
    return restoredDataViewSpec;
  }

  return navigationDataView ?? dataViewId;
};
