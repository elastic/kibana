/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TextBasedLayerColumn } from '@kbn/lens-plugin/public/datasources/form_based/esql_layer/types';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { LensBaseLayer } from '../types';

export function getValueColumn(
  id: string,
  fieldName?: string,
  type?: DatatableColumnType
): TextBasedLayerColumn {
  return {
    columnId: id,
    fieldName: fieldName || id,
    ...(type ? { meta: { type } } : {}),
  };
}

export function getColumnFromLayer(id: string, layer: LensBaseLayer): TextBasedLayerColumn {
  return {
    columnId: id,
    fieldName: layer.value || id,
    label: layer.label || layer.value || id,
    meta: { type: 'number' },
    ...(layer.format
      ? {
          params: {
            format: {
              id: layer.format as any,
              ...(layer.compactValues || layer.normalizeByUnit || layer.decimals
                ? {
                    params: {
                      compact: layer.compactValues,
                      decimals: layer.decimals || 0,
                    },
                  }
                : {}),
            },
          },
        }
      : {}),
    inMetricDimension: true,
  };
}
