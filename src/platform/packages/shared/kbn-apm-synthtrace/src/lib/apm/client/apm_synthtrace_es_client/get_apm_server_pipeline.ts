/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import semver from 'semver';
import { PassThrough } from 'stream';
import {
  isElasticApmAgent,
  isOpenTelemetryAgent,
} from '@kbn/apm-synthtrace-client/src/types/agent_names';
import { getDedotTransform } from '../../../shared/get_dedot_transform';
import { conditionalStreams, fork } from '../../../utils/stream_utils';
import { deleteSummaryFieldTransform } from '../../../utils/transform_helpers';
import { createBreakdownMetricsAggregator } from '../../aggregators/create_breakdown_metrics_aggregator';
import { createServiceMetricsAggregator } from '../../aggregators/create_service_metrics_aggregator';
import { createServiceSummaryMetricsAggregator } from '../../aggregators/create_service_summary_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../aggregators/create_span_metrics_aggregator';
import { createTransactionMetricsAggregator } from '../../aggregators/create_transaction_metrics_aggregator';
import { getApmServerMetadataTransform } from './get_apm_server_metadata_transform';
import { getIntakeDefaultsTransform } from './get_intake_defaults_transform';
import { getRoutingTransform } from './get_routing_transform';
import { getOtelRoutingTransform } from './otel/get_otel_routing_transform';
import { getOtelMetricsAggregators } from './otel/get_apm_otel_pipeline';
import { getOtelSpanTransform } from './get_otel_span_transform';
import { getOtelDynamicTemplateTransform } from './otel/get_otel_dynamic_template_transform';
import { getOtelDedotTransform } from './otel/get_otel_dedot_transform';

export function getApmServerPipeline(version: string) {
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

  const removeDurationSummaryTransform = !continousRollupSupported
    ? [deleteSummaryFieldTransform()]
    : [];

  return [
    getIntakeDefaultsTransform(),
    getApmServerMetadataTransform(version),
    conditionalStreams(
      (chunk) => isElasticApmAgent(chunk['agent.name']),
      [
        fork(new PassThrough({ objectMode: true }), ...aggregators),
        createBreakdownMetricsAggregator('30s'),
        getRoutingTransform(),
        getDedotTransform(),
        ...removeDurationSummaryTransform,
      ]
    ),
    conditionalStreams(
      (chunk) => isOpenTelemetryAgent(chunk['agent.name']),
      [
        getOtelSpanTransform(),
        fork(new PassThrough({ objectMode: true }), ...getOtelMetricsAggregators()),
        getOtelDynamicTemplateTransform(),
        getOtelRoutingTransform(),
        getOtelDedotTransform(),
      ]
    ),
  ];
}
