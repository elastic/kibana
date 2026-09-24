/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewSpec, DataViewsContract } from '@kbn/data-views-plugin/public';
import { generateInlineDataViewId, getInlineDataView } from '../../common/session/inline_data_view';

/** Gives Discover inline views the ID derived from their final spec, reusing the Data View cache. */
export interface InlineDataViewService {
  /**
   * Returns the instance for the spec of a view that is not persisted. Inline specs get their
   * derived ID and reuse the cached instance; ES|QL, managed and untitled specs are created as given.
   */
  resolve: (spec: DataViewSpec) => Promise<DataView>;
  /**
   * Returns the instance with the derived ID of the final spec of a view, such as after an editor
   * or inferred defaults. Persisted and excluded views are returned unchanged; nothing is evicted.
   */
  finalize: (dataView: DataView) => Promise<DataView>;
}

export const createInlineDataViewService = ({
  dataViews,
}: {
  dataViews: Pick<DataViewsContract, 'create'>;
}): InlineDataViewService => ({
  resolve: (spec) =>
    dataViews.create(
      getInlineDataView({ index: spec }) ? { ...spec, id: generateInlineDataViewId(spec) } : spec
    ),

  finalize: async (dataView) => {
    const minimalSpec = dataView.toMinimalSpec();
    if (dataView.isPersisted() || !getInlineDataView({ index: minimalSpec })) {
      return dataView;
    }

    const id = generateInlineDataViewId(minimalSpec);

    return id === dataView.id ? dataView : dataViews.create({ ...dataView.toSpec(), id }, true);
  },
});
