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
import { DEFAULT_DATA_CONTROL_STATE } from '@kbn/controls-constants';
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
  const { title, use_global_filters, ignore_validations, field_name, data_view_id } =
    convertCamelCasedKeysToSnakeCase<LegacyStoredDataControlState>(
      state as LegacyStoredDataControlState
    );

  // get the data view ID from the reference, or fall back to an explicitly stored dataViewId
  const dataViewId = dataViewRef?.id ?? data_view_id ?? '';
  const convertedState = {
    ...DEFAULT_DATA_CONTROL_STATE,
    data_view_id: dataViewId,
    ...(title && { title }),
    ...(typeof use_global_filters === 'boolean' && { use_global_filters }),
    ...(typeof ignore_validations === 'boolean' && { ignore_validations }),
    field_name: field_name ?? '',
  };

  // will throw if one of the required fields is the empty string
  ensureRequiredFields(convertedState);

  return convertedState;
}

function getLegacyReferenceName(controlId: string, refName: string) {
  return `controlGroup_${controlId}:${refName}`;
}

const ensureRequiredFields = (state: DataControlState) => {
  if (!state.data_view_id.length) {
    throw new Error('Must include a non-empty data view ID');
  } else if (!state.field_name.length) {
    throw new Error('Must include a non-empty field name ID');
  }
  return;
};
