/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import type { DataControlState } from '@kbn/controls-schemas';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { StoredDataControlState } from './types';

export function extractReferences(
  state: DataControlState,
  referenceName: string
): { state: StoredDataControlState; references?: Reference[] } {
  return {
    state: {
      ...omit(state, 'dataViewId'),
      dataViewRefName: referenceName,
    },
    references: [
      {
        name: referenceName,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: state.dataViewId,
      },
    ],
  };
}

export function injectReferences(
  id: string | undefined,
  state: StoredDataControlState,
  refName: string,
  references: Reference[] = []
): DataControlState {
  let { dataViewRefName } = state;
  if (!dataViewRefName && id) {
    // backwards compatibility for when we didn't store the ref name with the saved object (<v9.2.0)
    dataViewRefName = getLegacyReferenceName(id, refName);
  }
  const dataViewRef = references.find(({ name }) => name === dataViewRefName);
  return { ...omit(state, 'dataViewRefName'), dataViewId: dataViewRef?.id ?? '' };
}

function getLegacyReferenceName(controlId: string, refName: string) {
  return `controlGroup_${controlId}:${refName}`;
}
