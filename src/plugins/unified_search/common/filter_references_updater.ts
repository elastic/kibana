/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';

export interface UpdateFilterReferencesParams {
  /** The initial data view of the editable layer **/
  fromDataView: string;
  /** New data view of the editable layer
   *  @description undefined - in case of removing the layer
   */
  toDataView?: string | undefined;
  /** List of all Data Views used in all layers **/
  usedDataViews: string[] | [];
  /** Index to use by default if all layers are cleared **/
  defaultDataView?: string;
}

type FilterReferencesUpdater = (
  filters: Filter[]
) => (params: UpdateFilterReferencesParams) => Filter[] | undefined;

export const getFilterReferencesUpdater: FilterReferencesUpdater =
  (filters) =>
  ({ fromDataView, toDataView, usedDataViews, defaultDataView }) => {
    const countOfInitialDataView = usedDataViews.filter((i) => i === fromDataView).length;

    /** no action needed **/
    if (countOfInitialDataView > 1 || !filters.length || !fromDataView) {
      return;
    }

    /** removing layer **/
    if (fromDataView && !toDataView) {
      if (usedDataViews.length > 1) {
        toDataView = usedDataViews.filter((item) => item !== fromDataView)[0];
      }
      if (!toDataView && defaultDataView) {
        toDataView = defaultDataView;
      }
    }

    return filters.map((filter) => {
      if (filter.meta.index === fromDataView) {
        return {
          ...filter,
          meta: {
            ...filter.meta,
            index: toDataView,
          },
        };
      } else {
        return filter;
      }
    });
  };
