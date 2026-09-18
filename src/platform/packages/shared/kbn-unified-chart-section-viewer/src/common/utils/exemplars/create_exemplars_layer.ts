/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensPointsLayer } from '@kbn/lens-embeddable-utils';
import { createExemplarsQuery } from '../esql/create_exemplars_query';
import type { ParsedMetricItem } from '../../../types';

interface CreateExemplarsLayerParams {
  metricItem: ParsedMetricItem;
  /** Metric fields the grid-level probe found in the exemplars stream. */
  availableMetrics: Set<string>;
  whereStatements?: string[];
  originalSource?: string;
}

/**
 * Builds the Lens points layer that overlays OTLP exemplars on a metric chart, or returns
 * `undefined` when the metric has no exemplars to show.
 *
 * The layer carries only the ES|QL query. Lens executes it alongside the metric layer,
 * under the host's time range and filters, so the overlay keeps responding after the chart
 * is copied to a dashboard, where none of this package's hooks run.
 */
export const createExemplarsLayer = ({
  metricItem,
  availableMetrics,
  whereStatements,
  originalSource,
}: CreateExemplarsLayerParams): LensPointsLayer | undefined => {
  if (!availableMetrics.has(metricItem.metricName)) {
    return undefined;
  }

  const query = createExemplarsQuery({ metricItem, whereStatements, originalSource });
  if (!query) {
    return undefined;
  }

  // The points renderer matches columns by name, so the accessor is the raw metric name
  // even though the query references it escaped.
  return { type: 'points', query, yAccessor: metricItem.metricName };
};
