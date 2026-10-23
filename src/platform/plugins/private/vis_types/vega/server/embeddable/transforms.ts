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
import type { VegaByValueState } from './schema';

/** Panel filters are stored in their as code shape, with each `data_view_id` replaced by a reference name. */
export type StoredVegaState = Omit<VegaByValueState, 'filters'> & {
  filters?: StoredAsCodeFilter[];
};

export function getTransforms(drilldownTransforms: DrilldownTransforms, logger?: Logger) {
  return {
    transformIn: (
      state: VegaByValueState
    ): { state: StoredVegaState; references: SavedObjectReference[] } => {
      const { state: drilldownsState, references: drilldownReferences } =
        drilldownTransforms.transformIn(state);
      const { filters, ...rest } = drilldownsState;
      const { filters: storedFilters, references: filterReferences } =
        extractFilterReferences(filters);
      return {
        state: { ...rest, ...(storedFilters && { filters: storedFilters }) },
        references: [...drilldownReferences, ...filterReferences],
      };
    },
    transformOut: (
      storedState: StoredVegaState,
      panelReferences?: SavedObjectReference[]
    ): VegaByValueState => {
      const drilldownsState = drilldownTransforms.transformOut(storedState, panelReferences);
      const { filters: storedFilters, ...rest } = drilldownsState as StoredVegaState;
      if (!storedFilters) return rest as VegaByValueState;

      try {
        return {
          ...rest,
          filters: injectFilterReferences(storedFilters, panelReferences),
        } as VegaByValueState;
      } catch (error) {
        logger?.warn(`Unable to transform filter and query state on read. Error: ${error.message}`);
        // Keep the filters, without their unresolved data view, rather than failing the whole panel.
        return {
          ...rest,
          filters: storedFilters.map(
            ({ data_view_ref_name: dataViewRefName, ...filter }) => filter
          ),
        } as VegaByValueState;
      }
    },
  };
}
