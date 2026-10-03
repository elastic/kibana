/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewSpec, DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  generateInlineDataViewId,
  isInlineDataView,
  isInlineDataViewSpec,
} from '../../common/session/inline_data_view';
import {
  createInlineDataViewEditSession,
  type InlineDataViewEditSession,
} from './inline_data_view_edit_session';

/** Gives Discover inline views the ID derived from their final spec, reusing the Data View cache. */
export interface InlineDataViewService {
  /** Starts an isolated edit with explicit commit and disposal. */
  beginEdit: (source: DataView) => InlineDataViewEditSession;
  /**
   * Returns the instance for the spec of a view that is not persisted. Inline specs get their
   * derived ID and reuse the cached instance; ES|QL, managed and untitled specs are created as given.
   */
  resolve: (spec: DataViewSpec) => Promise<DataView>;
  /**
   * Returns the instance with the derived ID of the final spec of a view, such as after an editor
   * or inferred defaults. Persisted and excluded views are returned unchanged; nothing is evicted.
   * Expects a valid DataView and reuses its existing fields without fetching them.
   */
  finalize: (dataView: DataView) => Promise<DataView>;
}

/** Creates Discover's shared identity service and independent edit sessions. */
export const createInlineDataViewService = ({
  dataViews,
}: {
  dataViews: Pick<DataViewsContract, 'create' | 'clearInstanceCache'>;
}): InlineDataViewService => {
  const finalize = async (dataView: DataView): Promise<DataView> => {
    if (!isInlineDataView(dataView)) {
      return dataView;
    }

    const id = generateInlineDataViewId(dataView.toMinimalSpec());
    if (id === dataView.id) {
      return dataView;
    }

    return dataViews.create({ ...dataView.toSpec(), id }, true);
  };

  return {
    beginEdit: (source) => createInlineDataViewEditSession({ source, dataViews, finalize }),
    finalize,
    resolve: (spec) => {
      if (!isInlineDataViewSpec(spec)) {
        return dataViews.create(spec);
      }

      return dataViews.create({ ...spec, id: generateInlineDataViewId(spec) });
    },
  };
};
