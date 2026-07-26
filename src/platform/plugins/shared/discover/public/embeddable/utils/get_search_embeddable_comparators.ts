/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { isEqual, isUndefined, omit, omitBy } from 'lodash';
import type {
  EditableSavedSearchAttributes,
  SearchEmbeddableBaseState,
  SearchEmbeddableByReferenceState,
  SearchEmbeddableByValueState,
} from '../../../common/embeddable/types';
import type {
  DiscoverSessionEmbeddableByReferenceProps,
  DiscoverSessionEmbeddableByValueProps,
} from '../../../server';

type SearchEmbeddableStateAttrs = EditableSavedSearchAttributes &
  (
    | Omit<SearchEmbeddableByValueState, keyof SearchEmbeddableBaseState>
    | Omit<SearchEmbeddableByReferenceState, keyof SearchEmbeddableBaseState>
  );

export function getSearchEmbeddableComparators(
  isByValue: boolean,
  shouldSkipTabComparators: boolean
): StateComparators<SearchEmbeddableStateAttrs> {
  return {
    sort: 'deepEquality',
    columns: 'deepEquality',
    rowHeight: 'referenceEquality',
    sampleSize: 'referenceEquality',
    rowsPerPage: 'referenceEquality',
    headerRowHeight: 'referenceEquality',
    density: 'referenceEquality',
    grid: 'deepEquality',
    ...(isByValue
      ? { attributes: 'skip' }
      : {
          // While the selected tab is missing or inline editing is in progress,
          // skip tab-dependent comparators so unsaved-changes badges don't appear
          // until the user explicitly applies a tab change.
          selectedTabId: shouldSkipTabComparators ? 'skip' : 'referenceEquality',
          savedObjectId: 'skip',
        }),
  };
}

export function getDiscoverSessionEmbeddableComparators(
  isByValue: boolean,
  shouldSkipTabComparators: boolean
): StateComparators<
  DiscoverSessionEmbeddableByValueProps | DiscoverSessionEmbeddableByReferenceProps
> {
  return isByValue
    ? {
        tabs: (prev, next) => {
          if (prev == null || next == null) return prev == null && next == null;
          if (prev.length !== next.length) return false;
          return prev.every((tab, i) =>
            isEqual(omitBy(prev[i], isUndefined), omitBy(next[i], isUndefined))
          );
        },
      }
    : {
        // While the selected tab is missing or inline editing is in progress,
        // skip tab-dependent comparators so unsaved-changes badges don't appear
        // until the user explicitly applies a tab change.
        selected_tab_id: shouldSkipTabComparators ? 'skip' : 'referenceEquality',
        ref_id: 'skip',
        overrides: (prev = {}, next = {}) => {
          return (
            isEqual(prev.column_order ?? [], next.column_order ?? []) &&
            isEqual(prev.column_settings ?? {}, next.column_settings ?? {}) &&
            isEqual(prev.sort ?? [], next.sort ?? []) &&
            isEqual(
              omit(prev, ['column_order', 'column_settings', 'sort']),
              omit(next, ['column_order', 'column_settings', 'sort'])
            )
          );
        },
      };
}
