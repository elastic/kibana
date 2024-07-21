/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RootSchema } from '@kbn/ebt/client';

/**
 * Structure of the `metric` event
 */
export interface PerformanceMetricEvent {
  /**
   * The name of the event that is tracked in the metrics i.e. kibana_loaded, kibana_started
   */
  eventName: string;
  /**
   * Searchable but not aggregateable metadata relevant to the tracked action.
   */
  meta?: Record<string, unknown>;

  /**
   * @group Standardized fields
   * The time (in milliseconds) it took to run the entire action.
   */
  duration: number;

  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 1
   */
  key1?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 1
   */
  value1?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 2
   */
  key2?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 2
   */
  value2?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 3
   */
  key3?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 3
   */
  value3?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 4
   */
  key4?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 4
   */
  value4?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 5
   */
  key5?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 5
   */
  value5?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 6
   */
  key6?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 6
   */
  value6?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 7
   */
  key7?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 7
   */
  value7?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 8
   */
  key8?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 8
   */
  value8?: number;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Description label for the metric 9
   */
  key9?: string;
  /**
   * @group Free fields for custom metrics (searchable and aggregateable)
   * Value for the metric 9
   */
  value9?: number;
}

export const METRIC_EVENT_SCHEMA: RootSchema<PerformanceMetricEvent> = {
  eventName: {
    type: 'keyword',
    _meta: {
      description:
        'The name of the event that is tracked in the metrics i.e. kibana_loaded, kibana_started',
    },
  },
  meta: {
    type: 'pass_through',
    _meta: { description: 'Meta data that is searchable but not aggregatable', optional: true },
  },
  duration: {
    type: 'integer',
    _meta: { description: 'The main event duration in ms' },
  },
  key1: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 1', optional: true },
  },
  value1: {
    type: 'long',
    _meta: { description: 'Performance metric value 1', optional: true },
  },
  key2: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 2', optional: true },
  },
  value2: {
    type: 'long',
    _meta: { description: 'Performance metric value 2', optional: true },
  },
  key3: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 3', optional: true },
  },
  value3: {
    type: 'long',
    _meta: { description: 'Performance metric value 3', optional: true },
  },
  key4: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 4', optional: true },
  },
  value4: {
    type: 'long',
    _meta: { description: 'Performance metric value 4', optional: true },
  },
  key5: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 5', optional: true },
  },
  value5: {
    type: 'long',
    _meta: { description: 'Performance metric value 5', optional: true },
  },
  key6: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 6', optional: true },
  },
  value6: {
    type: 'long',
    _meta: { description: 'Performance metric value 6', optional: true },
  },
  key7: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 7', optional: true },
  },
  value7: {
    type: 'long',
    _meta: { description: 'Performance metric value 7', optional: true },
  },
  key8: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 8', optional: true },
  },
  value8: {
    type: 'long',
    _meta: { description: 'Performance metric value 8', optional: true },
  },
  key9: {
    type: 'keyword',
    _meta: { description: 'Performance metric label 9', optional: true },
  },
  value9: {
    type: 'long',
    _meta: { description: 'Performance metric value 9', optional: true },
  },
};
