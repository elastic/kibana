/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VENDOR } from './constants';

/** One entry of a 207 Multi-Status answer: the per-item status, headers and body. */
export interface MultiStatusItem {
  status?: number;
  headers?: Array<{ name?: string; value?: string }>;
  body?: { error?: { code?: string; message?: string }; [key: string]: unknown };
}

export interface ItemError {
  code: string | null;
  message: string | null;
}

export interface TaskOutcome {
  outcome: 'requested' | 'skipped';
  status: number | null;
  taskId: string | null;
  error: ItemError | null;
}

/** A per-item status the product answers for an unknown target, with a hint for the caller. */
export interface UnknownTarget {
  status: number;
  hint: string;
}

export interface ListOutcome {
  outcome: 'added' | 'removed' | 'notFound';
  status: number | null;
  error: ItemError | null;
}

/** The single item the connector sent; a non-array answer fails the action. */
export const firstItem = (action: string, data: unknown): MultiStatusItem => {
  if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== 'object') {
    throw new Error(`${VENDOR} ${action} returned no per-item status`);
  }
  return data[0] as MultiStatusItem;
};

const itemError = (item: MultiStatusItem): ItemError | null => {
  const error = item.body?.error;
  return error ? { code: error.code ?? null, message: error.message ?? null } : null;
};

const failItem = (action: string, item: MultiStatusItem): Error => {
  const error = itemError(item);
  const detail = [error?.code, error?.message].filter(Boolean).join(': ') || 'no details';
  return new Error(`${VENDOR} ${action} failed for the target (${item.status ?? '?'}): ${detail}`);
};

/** Takes the task id from the Operation-Location header: the last path segment. */
export const taskIdFrom = (item: MultiStatusItem): string | null => {
  const location = item.headers?.find((h) => h.name?.toLowerCase() === 'operation-location');
  if (!location?.value) return null;
  const segments = location.value.split('?')[0].split('/').filter(Boolean);
  return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : null;
};

/**
 * Item rules of a response task: 202 requested with its task id; "Task duplication." skipped (the
 * same task is already running); an unknown target ("Target not found.", 404, or the caller's
 * `unknownTarget` status) and any other item error fail the action.
 */
export const toTaskOutcome = (
  action: string,
  data: unknown,
  unknownTarget?: UnknownTarget
): TaskOutcome => {
  const item = firstItem(action, data);
  const status = item.status ?? null;
  const error = itemError(item);
  if (status !== null && status >= 200 && status < 300) {
    return { outcome: 'requested', status, taskId: taskIdFrom(item), error: null };
  }
  if (
    status === 400 &&
    error?.code === 'TaskError' &&
    /task duplication/i.test(error.message ?? '')
  ) {
    return { outcome: 'skipped', status, taskId: null, error };
  }
  const isUnknownTarget = unknownTarget !== undefined && status === unknownTarget.status;
  if (
    status === 404 ||
    isUnknownTarget ||
    (status === 400 && /target not found/i.test(error?.message ?? ''))
  ) {
    const detail = [error?.code, error?.message].filter(Boolean).join(': ') || 'no details';
    const hint = isUnknownTarget ? `. ${unknownTarget.hint}` : '';
    throw new Error(`${VENDOR} ${action} found no such target (${status}): ${detail}${hint}`);
  }
  throw failItem(action, item);
};

const NOT_ON_LIST = /not (exist|found)|does not exist|doesn't exist/i;

/** Item rules of a suspicious object or exception list change. */
export const toListOutcome = (
  action: string,
  data: unknown,
  success: 'added' | 'removed'
): ListOutcome => {
  const item = firstItem(action, data);
  const status = item.status ?? null;
  const error = itemError(item);
  if (status !== null && status >= 200 && status < 300) {
    return { outcome: success, status, error: null };
  }
  if (
    success === 'removed' &&
    (status === 404 || (status === 400 && NOT_ON_LIST.test(error?.message ?? '')))
  ) {
    return { outcome: 'notFound', status, error };
  }
  throw failItem(action, item);
};
