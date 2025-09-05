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

const REFERENCE_NAME_PREFIX = 'controlGroup_';

export function extractReferences(
  state: DataControlState,
  referenceNameSuffix: string
): { state: Omit<DataControlState, 'dataViewId'>; references?: Reference[] } {
  if (!state.id) return { state: { ...state } };
  console.log({ state });
  return {
    state: { ...omit(state, 'dataViewId') },
    references: [
      {
        name: getReferenceName(state.id, referenceNameSuffix),
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: state.dataViewId,
      },
    ],
  };
}

export function injectReferences(
  state: Omit<DataControlState, 'dataViewId'>,
  references: Reference[] = []
): DataControlState {
  const deserializedState = {
    dataViewId: '',
    ...state,
  };
  (references ?? []).forEach((reference) => {
    const referenceName = reference.name;
    const { controlId } = parseReferenceName(referenceName);
    if (controlId === deserializedState.id) deserializedState.dataViewId = reference.id;
  });
  return deserializedState;
}

function getReferenceName(controlId: string, referenceNameSuffix: string) {
  return `${REFERENCE_NAME_PREFIX}${controlId}:${referenceNameSuffix}`;
}

function parseReferenceName(referenceName: string) {
  return {
    controlId: referenceName.substring(
      REFERENCE_NAME_PREFIX.length,
      referenceName.lastIndexOf(':')
    ),
  };
}
