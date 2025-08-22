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

/**
 * Prometheus exporter for OpenTelemetry with a custom extension to collect the metrics whenever
 * the Prometheus HTTP endpoint is called.
 *
 * The Prometheus HTTP endpoint is registered in the plugin monitoringCollection.
 * @privateRemarks x-pack/platform/plugins/private/monitoring_collection/server/routes/api/v1/prometheus/get_metrics.ts
 */
export class PrometheusExporter extends metrics.MetricReader {
  /**
   * The singleton PrometheusExporter instance.
   * @private
   */
  static #instance?: PrometheusExporter;

  /**
   * Gets the singleton PrometheusExporter instance.
   */
  static get() {
    if (!this.#instance) {
      this.#instance = new PrometheusExporter();
    }
    return this.#instance;
  }

  /**
   * Destroys the singleton PrometheusExporter instance.
   * @privateRemarks Mostly used for testing purposes because the same exporter cannot be reassigned to new MetricsProvider.
   */
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

  /**
   * Forces the AggregationTemporality to be CUMULATIVE (as required by the Prometheus format).
   */
  selectAggregationTemporality(): metrics.AggregationTemporality {
    return metrics.AggregationTemporality.CUMULATIVE;
  }

  /**
   * Implementation of the MetricReader interface onForceFlush (noop).
   * @protected
   */
  protected onForceFlush(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Implementation of the MetricReader interface onShutdown (noop).
   * @protected
   */
  protected onShutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Responds to incoming message with current state of all metrics.
   * @param res {@link KibanaResponseFactory}
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
