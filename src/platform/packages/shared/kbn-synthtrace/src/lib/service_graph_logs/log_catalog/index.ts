/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Runtime, ServiceMessages, SuccessCorpus } from '../types';
import { DATABASE } from './database';
import { CACHE } from './cache';
import { MESSAGE_QUEUE } from './message_queue';
import { KUBERNETES } from './kubernetes';
import { HOST } from './host';
import { OUTBOUND } from './outbound';
import { REQUEST } from './request';

export { NOISE } from './noise';
export type { ConditionPool, RuntimeMessagePool, ServiceMessages, SuccessCorpus } from '../types';
export type { OutboundErrorCategory } from './outbound';

export const TECH_KEYED_ERROR_TYPES = new Set<keyof ServiceMessages>(['db_timeout']);

const pluck = <T extends Record<string, Record<K, unknown>>, K extends string>(
  catalog: T,
  key: K
): { [P in keyof T]: T[P][K] } => {
  const result = {} as { [P in keyof T]: T[P][K] };
  for (const k of Object.keys(catalog) as (keyof T)[]) result[k] = catalog[k][key];
  return result;
};

const invertSuccessPool = <TTech extends string>(
  catalog: Record<TTech, { app: { success: Partial<Record<Runtime, string[]>> } }>
): Partial<Record<Runtime, Record<TTech, string[]>>> => {
  const result: Partial<Record<Runtime, Record<TTech, string[]>>> = {};
  for (const tech of Object.keys(catalog) as TTech[]) {
    for (const [rt, msgs] of Object.entries(catalog[tech].app.success) as [Runtime, string[]][]) {
      (result[rt] ??= {} as Record<TTech, string[]>)[tech] = msgs;
    }
  }
  return result;
};

export const INFRA = {
  database: pluck(DATABASE, 'infra'),
  cache: pluck(CACHE, 'infra'),
  message_queue: pluck(MESSAGE_QUEUE, 'infra'),
  kubernetes: pluck(KUBERNETES, 'infra'),
  host: HOST,
};

export const SERVICE_MESSAGES: ServiceMessages = {
  internal_error: REQUEST.internal_error,
  bad_gateway: REQUEST.bad_gateway,
  gateway_timeout: REQUEST.gateway_timeout,
  db_timeout: pluck(pluck(DATABASE, 'app'), 'db_timeout'),
  k8s_oom: KUBERNETES.kubelet.app.k8s_oom,
  k8s_crash_loop_backoffoff: KUBERNETES.kubelet.app.k8s_crash_loop_backoffoff,
};

const SUCCESS: SuccessCorpus = {
  always: REQUEST.success,
  database: invertSuccessPool(DATABASE),
  cache: invertSuccessPool(CACHE),
  messageQueue: invertSuccessPool(MESSAGE_QUEUE),
};

export const SERVICE = {
  request: { success: SUCCESS, messages: SERVICE_MESSAGES },
  stackTraces: REQUEST.stack_traces,
  serviceCalls: { outbound: OUTBOUND },
};
