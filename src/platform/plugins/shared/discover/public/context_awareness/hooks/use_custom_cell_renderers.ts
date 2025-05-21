/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type CellRendererColumnMap, type GetCustomCellRenderer } from '@kbn/unified-data-table';
import { useCallback } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { CellRenderersExtensionParams } from '../types';
import { getMergedAccessor } from '../composable_profile';

export const useCustomCellRenderers = (
  cellRendererParams: CellRenderersExtensionParams,
  defaultCellRenderers?: CellRendererColumnMap
) => {
  const { profilesManager } = useDiscoverServices();

  return useCallback<GetCustomCellRenderer>(
    (params) => {
      const profiles = profilesManager.getProfiles({ record: params.row });
      const getCellRenderersAccessor = getMergedAccessor(
        profiles,
        'getCellRenderers',
        () => defaultCellRenderers ?? {}
      );
      const cellRenderers = getCellRenderersAccessor(cellRendererParams);
      return cellRenderers[params.columnId];
    },
    [cellRendererParams, defaultCellRenderers, profilesManager]
  );
};
