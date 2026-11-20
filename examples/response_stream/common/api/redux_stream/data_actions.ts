/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SLICE_NAME = 'development';

// Plain action creators so the server can build stream actions without loading Redux Toolkit.
const createDataAction =
  <Payload = void>() =>
  <Name extends string>(name: Name) => {
    const type = `${SLICE_NAME}/${name}` as const;
    return Object.assign((payload: Payload) => ({ type, payload }), { type });
  };

export const updateProgress = createDataAction<number>()('updateProgress');
export const addToEntity = createDataAction<{ entity: string; value: number }>()('addToEntity');
export const deleteEntity = createDataAction<string>()('deleteEntity');
export const error = createDataAction<string>()('error');
export const reset = createDataAction()('reset');

export const dataActions = { updateProgress, addToEntity, deleteEntity, error, reset };

export type ReduxStreamApiAction = ReturnType<(typeof dataActions)[keyof typeof dataActions]>;
