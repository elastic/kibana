/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, SavedObjectReference } from '@kbn/core/server';
import {
  extractFilterReferences,
  injectFilterReferences,
  type StoredAsCodeFilter,
} from '@kbn/as-code-filters-transforms';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { VEGA_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { VegaByReferenceState, VegaByValueState, VegaEmbeddableState } from './schema';

const VEGA_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

/**
 * Panel filters are stored in their as code shape, with each `data_view_id` replaced by a reference
 * name. By-reference panels store their library item ID as a reference instead of `ref_id`.
 */
export type StoredVegaState =
  | (Omit<VegaByValueState, 'filters'> & { filters?: StoredAsCodeFilter[] })
  | (Omit<VegaByReferenceState, 'filters' | 'ref_id'> & { filters?: StoredAsCodeFilter[] });

export function getTransforms(drilldownTransforms: DrilldownTransforms, logger?: Logger) {
  return {
    transformIn: (
      state: VegaEmbeddableState
    ): { state: StoredVegaState; references: SavedObjectReference[] } => {
      const { state: drilldownsState, references: drilldownReferences } =
        drilldownTransforms.transformIn(state);
      const { filters, ...rest } = drilldownsState;
      const { filters: storedFilters, references: filterReferences } =
        extractFilterReferences(filters);
      const panelReferences = [...drilldownReferences, ...filterReferences];

      if ('ref_id' in rest) {
        const { ref_id: refId, ...byReferenceState } = rest;
        return {
          state: { ...byReferenceState, ...(storedFilters && { filters: storedFilters }) },
          references: [
            { name: VEGA_SAVED_OBJECT_REF_NAME, type: VEGA_SAVED_OBJECT_TYPE, id: refId },
            ...panelReferences,
          ],
        };
      }

      return {
        state: { ...rest, ...(storedFilters && { filters: storedFilters }) },
        references: panelReferences,
      };
    },
    transformOut: (
      storedState: StoredVegaState,
      panelReferences?: SavedObjectReference[]
    ): VegaEmbeddableState => {
      const drilldownsState = drilldownTransforms.transformOut(storedState, panelReferences);
      const { filters: storedFilters, ...rest } = drilldownsState as StoredVegaState;
      const libraryReference = panelReferences?.find(
        ({ name, type }) => name === VEGA_SAVED_OBJECT_REF_NAME && type === VEGA_SAVED_OBJECT_TYPE
      );
      const state = libraryReference ? { ...rest, ref_id: libraryReference.id } : rest;
      if (!storedFilters) return state as VegaEmbeddableState;

      try {
        return {
          ...state,
          filters: injectFilterReferences(storedFilters, panelReferences),
        } as VegaEmbeddableState;
      } catch (error) {
        logger?.warn(`Unable to transform filter and query state on read. Error: ${error.message}`);
        // Keep the filters, without their unresolved data view, rather than failing the whole panel.
        return {
          ...state,
          filters: storedFilters.map(
            ({ data_view_ref_name: dataViewRefName, ...filter }) => filter
          ),
        } as VegaEmbeddableState;
      }
    },
  };
}
