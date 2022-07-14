/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @internal */
export const KBN_LOAD_MARKS = 'kbnLoad';

export { KIBANA_LOADED_EVENT } from '../../utils';

export const LOAD_START = 'load-started';
export const LOAD_BOOTSTRAP_START = 'bootstrap-start';
export const LOAD_CORE_CREATED = 'core-created';
export const LOAD_SETUP_DONE = 'setup-done';
export const LOAD_START_DONE = 'start-done';
export const LOAD_FIRST_NAV = 'first-app-nav';

export interface PerformanceMetricEvent {
  duration?: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  key1?: string;
  value1?: number;
  key2?: string;
  value2?: number;
  key3?: string;
  value3?: number;
  key4?: string;
  value4?: number;
  key5?: string;
  value5?: number;
}

export const PERFORMANCE_METRIC_EVENT_SCHEMA: Record<keyof PerformanceMetricEvent, any> = {
  duration: {
    type: 'long',
    _meta: { description: 'The main event duration', optional: true },
  },
  jsHeapSizeLimit: {
    type: 'long',
    _meta: { description: 'performance.memory.jsHeapSizeLimit', optional: true },
  },
  totalJSHeapSize: {
    type: 'long',
    _meta: { description: 'performance.memory.totalJSHeapSize', optional: true },
  },
  usedJSHeapSize: {
    type: 'long',
    _meta: { description: 'performance.memory.usedJSHeapSize', optional: true },
  },
  key1: {
    type: 'keyword',
    _meta: { description: 'Performance metric label', optional: true },
  },
  value1: {
    type: 'long',
    _meta: { description: 'Performance metric value', optional: true },
  },
  key2: {
    type: 'keyword',
    _meta: { description: 'Performance metric label', optional: true },
  },
  value2: {
    type: 'long',
    _meta: { description: 'Performance metric value', optional: true },
  },
  key3: {
    type: 'keyword',
    _meta: { description: 'Performance metric label', optional: true },
  },
  value3: {
    type: 'long',
    _meta: { description: 'Performance metric value', optional: true },
  },
  key4: {
    type: 'keyword',
    _meta: { description: 'Performance metric label', optional: true },
  },
  value4: {
    type: 'long',
    _meta: { description: 'Performance metric value', optional: true },
  },
  key5: {
    type: 'keyword',
    _meta: { description: 'Performance metric label', optional: true },
  },
  value5: {
    type: 'long',
    _meta: { description: 'Performance metric value', optional: true },
  },
};
