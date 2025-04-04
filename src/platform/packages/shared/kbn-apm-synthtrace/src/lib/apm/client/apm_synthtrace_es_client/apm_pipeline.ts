/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import semver from 'semver';
import { PassThrough, pipeline, Readable } from 'stream';
import { getDedotTransform } from '../../../shared/get_dedot_transform';
import { getSerializeTransform } from '../../../shared/get_serialize_transform';
import { Logger } from '../../../utils/create_logger';
import { fork } from '../../../utils/stream_utils';
import { deleteSummaryFieldTransform } from '../../../utils/transform_helpers';
import { createBreakdownMetricsAggregator } from '../../aggregators/create_breakdown_metrics_aggregator';
import { createServiceMetricsAggregator } from '../../aggregators/create_service_metrics_aggregator';
import { createServiceSummaryMetricsAggregator } from '../../aggregators/create_service_summary_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../aggregators/create_span_metrics_aggregator';
import { createTransactionMetricsAggregator } from '../../aggregators/create_transaction_metrics_aggregator';
import { getApmServerMetadataTransform } from './get_apm_server_metadata_transform';
import { getIntakeDefaultsTransform } from './get_intake_defaults_transform';
import { getRoutingTransform } from './get_routing_transform';

export function apmPipeline(logger: Logger, version: string, includeSerialization: boolean = true) {
  return (base: Readable) => {
    const continousRollupSupported =
      !version || semver.gte(semver.coerce(version)?.version ?? version, '8.7.0');

    const aggregators = [
      createTransactionMetricsAggregator('1m'),
      createSpanMetricsAggregator('1m'),
      ...(continousRollupSupported
        ? [
            createTransactionMetricsAggregator('10m'),
            createTransactionMetricsAggregator('60m'),
            createServiceMetricsAggregator('1m'),
            createServiceMetricsAggregator('10m'),
            createServiceMetricsAggregator('60m'),
            createServiceSummaryMetricsAggregator('1m'),
            createServiceSummaryMetricsAggregator('10m'),
            createServiceSummaryMetricsAggregator('60m'),
            createSpanMetricsAggregator('10m'),
            createSpanMetricsAggregator('60m'),
          ]
        : []),
    ];

    const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];
    const removeDurationSummaryTransform = !continousRollupSupported
      ? [deleteSummaryFieldTransform()]
      : [];

    return pipeline(
      // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
      base,
      ...serializationTransform,
      getIntakeDefaultsTransform(),
      fork(new PassThrough({ objectMode: true }), ...aggregators),
      createBreakdownMetricsAggregator('30s'),
      getApmServerMetadataTransform(version),
      getRoutingTransform(),
      getDedotTransform(),
      ...removeDurationSummaryTransform,
      (err) => {
        if (err) {
          logger.error(err);
        }
      }
    );
  };
}
