/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectFilterReferences } from '@kbn/as-code-filters-transforms';
import type { Logger, SavedObjectReference } from '@kbn/core/server';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { VEGA_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { VEGA_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { StoredVegaByValueState, StoredVegaEmbeddableState } from '../types';

export const getTransformOut = (
  transformDrilldownsOut: DrilldownTransforms['transformOut'],
  logger?: Logger
) => {
  const transformOut = (
    storedState: StoredVegaEmbeddableState,
    panelReferences?: SavedObjectReference[]
  ) => {
    const state = transformDrilldownsOut(storedState, panelReferences);

    // by ref
    const savedObjectRef = (panelReferences ?? []).find(
      (ref) => VEGA_SAVED_OBJECT_TYPE === ref.type && ref.name === VEGA_SAVED_OBJECT_REF_NAME
    );

    if (savedObjectRef) {
      return {
        ...state,
        ref_id: savedObjectRef.id,
      };
    }

    // by value
    const { filters: extractedFilters, ...rest } = state as StoredVegaByValueState;
    if (!extractedFilters) return rest;

    try {
      return { ...rest, filters: injectFilterReferences(extractedFilters, panelReferences) };
    } catch (error) {
      logger?.warn(`Unable to transform filter and query state on read. Error: ${error.message}`);
      // Keep the filters, without their unresolved data view, rather than failing the whole panel.
      return {
        ...rest,
        filters: extractedFilters.map(
          ({ data_view_ref_name: dataViewRefName, ...filter }) => filter
        ),
      };
    }
  };
  return transformOut;
};
