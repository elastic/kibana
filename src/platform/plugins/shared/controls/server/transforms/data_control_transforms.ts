/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DataControlState, LegacyStoredDataControlState } from '@kbn/controls-schemas';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';

export function transformDataControlIn(
  state: DataControlState,
  referenceName: string
): {
  state: Omit<DataControlState, 'data_view_id'> & { dataViewRefName: string };
  references?: Reference[];
} {
  const { data_view_id, ...rest } = state;
  return {
    state: {
      ...rest,
      dataViewRefName: referenceName,
    },
    references: [
      {
        name: referenceName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: data_view_id,
      },
    ],
  };
}

export function transformDataControlOut<
  StoredStateType extends Partial<LegacyStoredDataControlState & DataControlState>
>(
  id: string | undefined,
  state: StoredStateType,
  refNames: Readonly<string[]>,
  panelReferences: Reference[] = [],
  containerReferences: Reference[] = []
): DataControlState {
  const references = [...containerReferences, ...panelReferences];
  let { dataViewRefName } = state;
  let dataViewRef: Reference | undefined;
  if (!dataViewRefName && id) {
    // backwards compatibility for when we didn't store the ref name with the saved object (<9.4)
    for (const refName of refNames) {
      dataViewRefName = getLegacyReferenceName(id, refName);
      dataViewRef = references.find(({ name }) => name === dataViewRefName);
      if (dataViewRef) break; // found the reference - so stop looking
    }
  } else {
    dataViewRef = references.find(({ name }) => name === dataViewRefName);
  }

  /**
   * Pre 9.4 the control state was stored in camelCase; these transforms ensure they are converted to snake_case
   */
  const { title, use_global_filters, ignore_validations, field_name } =
    convertCamelCasedKeysToSnakeCase<LegacyStoredDataControlState>(
      state as LegacyStoredDataControlState
    );

  return {
    title,
    data_view_id: dataViewRef?.id ?? '', // get the data view ID from the reference
    use_global_filters,
    ignore_validations,
    field_name: field_name ?? '',
  };
}

function getLegacyReferenceName(controlId: string, refName: string) {
  return `controlGroup_${controlId}:${refName}`;
}
