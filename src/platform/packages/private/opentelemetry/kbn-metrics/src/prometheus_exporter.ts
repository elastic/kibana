/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics } from '@elastic/opentelemetry-node/sdk';
import {
  PrometheusExporter as OpenTelemetryPrometheusExporter,
  PrometheusSerializer,
} from '@opentelemetry/exporter-prometheus';
import type { KibanaResponseFactory } from '@kbn/core-http-server';

export class PrometheusExporter extends metrics.MetricReader {
  static #instance?: PrometheusExporter;

  static get() {
    if (!this.#instance) {
      this.#instance = new PrometheusExporter();
    }
    return this.#instance;
  }

  static destroy() {
    this.#instance?.shutdown();
    this.#instance = undefined;
  }

  private readonly prefix: string;
  private readonly appendTimestamp: boolean;
  private serializer: PrometheusSerializer;

  private constructor() {
    super();
    this.prefix = OpenTelemetryPrometheusExporter.DEFAULT_OPTIONS.prefix;
    this.appendTimestamp = OpenTelemetryPrometheusExporter.DEFAULT_OPTIONS.appendTimestamp;

    this.serializer = new PrometheusSerializer(this.prefix, this.appendTimestamp);
  }

  selectAggregationTemporality(): metrics.AggregationTemporality {
    return metrics.AggregationTemporality.CUMULATIVE;
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve(undefined);
  }

  protected onShutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Responds to incoming message with current state of all metrics.
   */
  public async exportMetrics(res: KibanaResponseFactory) {
    try {
      const collectionResult = await this.collect();
      const { resourceMetrics, errors } = collectionResult;
      if (errors.length) {
        return res.customError({
          statusCode: 500,
          body: `PrometheusExporter: Metrics collection errors ${errors}`,
        });
      }
      const result = this.serializer.serialize(resourceMetrics);
      if (result === '') {
        return res.noContent();
      }
      return res.ok({
        body: result,
      });
    } catch (error) {
      return res.customError({
        statusCode: 500,
        body: {
          message: `PrometheusExporter: Failed to export metrics ${error}`,
        },
      });
    }
  }
}
