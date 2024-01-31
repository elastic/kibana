/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { TextBasedPersistedState } from '@kbn/lens-plugin/public/datasources/text_based/types';

export const updateTablesInLensAttributes = ({
  attributes,
  table,
}: {
  attributes: LensAttributes;
  table: Datatable | undefined;
}): LensAttributes => {
  if (!attributes.state.datasourceStates.textBased) {
    return attributes;
  }

  const layers = attributes.state.datasourceStates.textBased?.layers;

  const updatedAttributes = {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...attributes.state.datasourceStates.textBased,
          layers: {} as TextBasedPersistedState['layers'],
        },
      },
    },
  };

  if (layers) {
    for (const key of Object.keys(layers)) {
      const newLayer = { ...layers[key], table };
      if (!table) {
        delete newLayer.table;
      }
      updatedAttributes.state.datasourceStates.textBased.layers[key] = newLayer;
    }
  }

  return updatedAttributes;
};

export const removeTablesFromLensAttributes = (attributes: LensAttributes): LensAttributes => {
  return updateTablesInLensAttributes({ attributes, table: undefined });
};
