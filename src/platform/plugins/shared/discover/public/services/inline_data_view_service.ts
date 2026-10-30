/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ISearchSource,
  ISearchStartSearchSource,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import type { DataView, DataViewSpec, DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  generateInlineDataViewId,
  getInlineDataView,
  isInlineDataView,
  isInlineDataViewSpec,
} from '../../common/session/inline_data_view';
import {
  createInlineDataViewEditSession,
  type InlineDataViewEditSession,
} from './inline_data_view_edit_session';

export interface InlineDataViewCreationOptions {
  /** Selects this field when it is a date; otherwise keeps the spec's time field. */
  preferredTimeField?: string;
}

/** Gives Discover inline views the ID derived from their final spec, reusing the Data View cache. */
export interface InlineDataViewService {
  /** Creates an isolated view, applies the requested defaults and returns its final identity. */
  create: (spec: DataViewSpec, options?: InlineDataViewCreationOptions) => Promise<DataView>;
  /** Finalizes a newly created view owned by the caller and releases it only if replaced. */
  completeCreation: (createdDataView: DataView) => Promise<DataView>;
  /** Starts an isolated edit with explicit commit and disposal. */
  beginEdit: (source: DataView) => InlineDataViewEditSession;
  /**
   * Returns the instance for the spec of a view that is not persisted. Inline specs get their
   * derived ID and reuse the cached instance unless it no longer matches that ID; ES|QL, managed
   * and untitled specs are created as given.
   */
  resolve: (spec: DataViewSpec) => Promise<DataView>;
  /**
   * Returns the instance with the derived ID of the final spec of a view, such as after an editor
   * or inferred defaults. Persisted and excluded views are returned unchanged. Only a cached
   * instance that no longer matches the derived ID is evicted and replaced.
   * Expects a valid DataView and reuses its existing fields without fetching them.
   */
  finalize: (dataView: DataView) => Promise<DataView>;
  /**
   * Creates a SearchSource from serialized fields and assigns it the resolved instance of an inline
   * view. Other views are created by the SearchSource service as given.
   */
  resolveSearchSource: (fields: SerializedSearchSourceFields) => Promise<ISearchSource>;
}

/** Creates Discover's shared identity service and independent edit sessions. */
export const createInlineDataViewService = ({
  dataViews,
  searchSource,
}: {
  dataViews: Pick<DataViewsContract, 'create' | 'clearInstanceCache'>;
  searchSource: Pick<ISearchStartSearchSource, 'create'>;
}): InlineDataViewService => {
  // Other apps, such as Lens, can edit a cached instance in place, so reuse it only while it
  // still matches its ID.
  const getConsistentDataView = async (id: string, createDataView: () => Promise<DataView>) => {
    const cachedDataView = await createDataView();
    if (generateInlineDataViewId(cachedDataView.toMinimalSpec()) === id) {
      return cachedDataView;
    }

    dataViews.clearInstanceCache(id);

    return createDataView();
  };

  const finalize = async (dataView: DataView) => {
    if (!isInlineDataView(dataView)) {
      return dataView;
    }

    const id = generateInlineDataViewId(dataView.toMinimalSpec());
    if (id === dataView.id) {
      return dataView;
    }

    return getConsistentDataView(id, () => dataViews.create({ ...dataView.toSpec(), id }, true));
  };

  const completeCreation = async (createdDataView: DataView) => {
    const finalizedDataView = await finalize(createdDataView);
    if (createdDataView.id && createdDataView.id !== finalizedDataView.id) {
      dataViews.clearInstanceCache(createdDataView.id);
    }

    return finalizedDataView;
  };

  const resolve = (spec: DataViewSpec) => {
    if (!isInlineDataViewSpec(spec)) {
      return dataViews.create(spec);
    }

    const id = generateInlineDataViewId(spec);

    return getConsistentDataView(id, () => dataViews.create({ ...spec, id }));
  };

  return {
    create: async (spec, { preferredTimeField } = {}) => {
      // Defaults must be applied to an isolated instance before its identity is shared.
      const draft = await dataViews.create({ ...spec, id: undefined });
      if (preferredTimeField && draft.fields.getByName(preferredTimeField)?.type === 'date') {
        draft.timeFieldName = preferredTimeField;
      }

      return completeCreation(draft);
    },
    completeCreation,
    beginEdit: (source) => createInlineDataViewEditSession({ source, dataViews, finalize }),
    finalize,
    resolve,
    resolveSearchSource: async (fields) => {
      const inlineDataView = getInlineDataView(fields);
      if (!inlineDataView) {
        return searchSource.create(fields);
      }

      const createdSearchSource = await searchSource.create({ ...fields, index: undefined });
      const dataView = await resolve(inlineDataView);
      createdSearchSource.setField('index', dataView);

      return createdSearchSource;
    },
  };
};
