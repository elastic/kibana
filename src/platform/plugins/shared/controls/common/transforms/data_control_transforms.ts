/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DataControlState, StoredDataControlState } from '@kbn/controls-schemas';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';

export function transformDataControlIn(
  state: DataControlState,
  referenceName: string
): { state: StoredDataControlState; references?: Reference[] } {
  const { title, description, use_global_filters, ignore_validations, data_view_id, field_name } =
    state;
  return {
    state: {
      title,
      description,
      useGlobalFilters: use_global_filters,
      ignoreValidations: ignore_validations,
      fieldName: field_name,
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

export function transformDataControlOut(
  id: string | undefined,
  state: StoredDataControlState,
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
  return {
    title: state.title,
    description: state.description,
    use_global_filters: state.useGlobalFilters,
    ignore_validations: state.ignoreValidations,
    field_name: state.fieldName,
    data_view_id: dataViewRef?.id ?? '',
  };
}

function getLegacyReferenceName(controlId: string, refName: string) {
  return `controlGroup_${controlId}:${refName}`;
}
