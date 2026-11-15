/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DocViewFindSimilarValuesFn } from '@kbn/unified-doc-viewer/types';
import type {
  UnifiedDataTableOpenInNewTab,
  UnifiedDataTableQueryContext,
} from '@kbn/unified-data-table';
import {
  executeFindSimilarValues,
  isFindSimilarValuesActionRegistered,
} from '@kbn/unified-data-table';
import { useDiscoverServices } from '../../hooks/use_discover_services';

/**
 * Creates the "Find similar values" callback of the doc viewer.
 * It's only available if the action is registered and the host provides the query context.
 */
export const useOnFindSimilarValues = ({
  dataView,
  queryContext,
  onOpenInNewTab,
}: {
  dataView: DataView;
  queryContext?: UnifiedDataTableQueryContext;
  onOpenInNewTab?: UnifiedDataTableOpenInNewTab;
}): DocViewFindSimilarValuesFn | undefined => {
  const { uiActions } = useDiscoverServices();

  return useMemo(() => {
    if (!queryContext || !isFindSimilarValuesActionRegistered(uiActions)) {
      return undefined;
    }

    return (fieldName, fieldValue) => {
      const field = dataView.fields.getByName(fieldName);
      if (!field) {
        return;
      }
      executeFindSimilarValues({
        uiActions,
        dataView,
        field,
        fieldValue,
        queryContext,
        onOpenInNewTab,
      });
    };
  }, [dataView, onOpenInNewTab, queryContext, uiActions]);
};
