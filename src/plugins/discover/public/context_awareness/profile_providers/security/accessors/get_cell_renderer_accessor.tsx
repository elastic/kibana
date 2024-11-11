/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SecuritySolutionCellRenderFeature } from '@kbn/discover-shared-plugin/public/services/discover_features';
import { DataGridCellValueElementProps } from '@kbn/unified-data-table';

export const createCellRendererAccessor = async (
  cellRendererFeature?: SecuritySolutionCellRenderFeature
) => {
  if (!cellRendererFeature) return undefined;
  const cellRendererGetter = await cellRendererFeature.getRender();
  function getCellRenderer(fieldName: string) {
    if (!cellRendererFeature) return undefined;
    const CellRenderer = cellRendererGetter(fieldName);
    if (!CellRenderer) return undefined;
    return React.memo(function SecuritySolutionCellRenderer(props: DataGridCellValueElementProps) {
      return <CellRenderer {...props} />;
    });
  }

  return getCellRenderer;
};
