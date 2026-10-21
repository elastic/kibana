/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useContext } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { REVERSE_CATEGORIZE_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { UnifiedDataTableContext } from '../table_context';

const ACTION_REVERSE_CATEGORIZE_FIELD = 'ACTION_REVERSE_CATEGORIZE_FIELD';

/**
 * Runs the "Find similar values" (reverse categorization) analysis for a value of a text field,
 * using the query context of the surrounding data table.
 * `isAvailable` is false unless the field is a text field of a time based data view and the
 * action is registered.
 */
export const useFindSimilarValues = ({
  uiActions,
  dataView,
  field,
}: {
  uiActions?: UiActionsStart;
  dataView: DataView;
  field: DataViewField | undefined;
}): { isAvailable: boolean; findSimilarValues: (fieldValue: string) => void } => {
  const { queryContext, onOpenInNewTab } = useContext(UnifiedDataTableContext);

  const isAvailable =
    uiActions?.hasAction(ACTION_REVERSE_CATEGORIZE_FIELD) === true &&
    field?.esTypes?.includes('text') === true &&
    dataView.isTimeBased();

  const findSimilarValues = useCallback(
    (fieldValue: string) => {
      if (!uiActions || !field) {
        return;
      }
      uiActions.executeTriggerActions(REVERSE_CATEGORIZE_FIELD_TRIGGER, {
        field,
        dataView,
        originatingApp: 'discover',
        fieldValue,
        openInNewTab: onOpenInNewTab,
        query: queryContext?.query,
        filters: queryContext?.filters,
        filterQuery: queryContext?.filterQuery,
        timeRange: queryContext?.timeRange,
      });
    },
    [dataView, field, onOpenInNewTab, queryContext, uiActions]
  );

  return { isAvailable, findSimilarValues };
};
