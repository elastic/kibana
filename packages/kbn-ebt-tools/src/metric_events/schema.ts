/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface MetricEvent extends Record<string, any> {
  event_name: string;
  meta?: Record<string, any>;

  // Standardized fields
  duration?: number;
  status?: string;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;

  // Free fields - will be mapped in the index;
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

export const METRIC_EVENT_SCHEMA: Record<keyof MetricEvent, any> = {
  event_name: {
    type: 'keyword',
    _meta: { description: 'Type of the event' },
  },
  meta: {
    type: 'pass_through',
    _meta: { description: 'Meta data that is searchable but not aggregatable', optional: true },
  },
  duration: {
    type: 'integer',
    _meta: { description: 'The main event duration in ms', optional: true },
  },
  status: {
    type: 'keyword',
    _meta: { description: 'A status', optional: true },
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
