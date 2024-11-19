/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const API_ACTION_NAME = {
  UPDATE_PROGRESS: 'update_progress',
  ADD_TO_ENTITY: 'add_to_entity',
  DELETE_ENTITY: 'delete_entity',
  ERROR: 'error',
} as const;
export type ApiActionName = (typeof API_ACTION_NAME)[keyof typeof API_ACTION_NAME];

interface ApiActionUpdateProgress {
  type: typeof API_ACTION_NAME.UPDATE_PROGRESS;
  payload: number;
}

export function updateProgressAction(payload: number): ApiActionUpdateProgress {
  return {
    type: API_ACTION_NAME.UPDATE_PROGRESS,
    payload,
  };
}

interface ApiActionAddToEntity {
  type: typeof API_ACTION_NAME.ADD_TO_ENTITY;
  payload: {
    entity: string;
    value: number;
  };
}

export function addToEntityAction(entity: string, value: number): ApiActionAddToEntity {
  return {
    type: API_ACTION_NAME.ADD_TO_ENTITY,
    payload: {
      entity,
      value,
    },
  };
}

interface ApiActionDeleteEntity {
  type: typeof API_ACTION_NAME.DELETE_ENTITY;
  payload: string;
}

export function deleteEntityAction(payload: string): ApiActionDeleteEntity {
  return {
    type: API_ACTION_NAME.DELETE_ENTITY,
    payload,
  };
}

interface ApiActionError {
  type: typeof API_ACTION_NAME.ERROR;
  payload: string;
}

export function errorAction(payload: string): ApiActionError {
  return {
    type: API_ACTION_NAME.ERROR,
    payload,
  };
}

export type ReducerStreamApiAction =
  | ApiActionUpdateProgress
  | ApiActionAddToEntity
  | ApiActionDeleteEntity
  | ApiActionError;
