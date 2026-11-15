/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { LatencyMapUnit } from '../types';

/** `1 span`, `3 traces`: what the map counts, by its unit. */
export const getCountText = (unit: LatencyMapUnit, count: number, estimated = false) => {
  const text =
    unit === 'traces'
      ? i18n.translate('traceLatencyMap.count.traces', {
          defaultMessage: '{count, plural, one {# trace} other {# traces}}',
          values: { count },
        })
      : i18n.translate('traceLatencyMap.count.spans', {
          defaultMessage: '{count, plural, one {# span} other {# spans}}',
          values: { count },
        });
  return estimated
    ? i18n.translate('traceLatencyMap.count.estimated', {
        defaultMessage: '~{count}',
        values: { count: text },
      })
    : text;
};

/** `Slowest spans (> p95)`: the label of a slowest-shortcut selection, by the map's unit. */
export const getSlowestLabel = (unit: LatencyMapUnit, percentile: number) =>
  unit === 'traces'
    ? i18n.translate('traceLatencyMap.slowestTracesLabel', {
        defaultMessage: 'Slowest traces (> p{percentile})',
        values: { percentile },
      })
    : i18n.translate('traceLatencyMap.slowestSpansLabel', {
        defaultMessage: 'Slowest spans (> p{percentile})',
        values: { percentile },
      });

/** The tooltip's hint at what the pointer can do. */
export const getInteractionHint = (unit: LatencyMapUnit, canClick: boolean) => {
  if (!canClick)
    return i18n.translate('traceLatencyMap.hint.drag', { defaultMessage: 'Drag to select.' });
  return unit === 'traces'
    ? i18n.translate('traceLatencyMap.hint.clickTrace', {
        defaultMessage: 'Click for an example trace. Drag to select.',
      })
    : i18n.translate('traceLatencyMap.hint.clickSpan', {
        defaultMessage: 'Click for an example span. Drag to select.',
      });
};

export const getFailedText = (failed: number, spans: number) =>
  i18n.translate('traceLatencyMap.count.failed', {
    // `number` formats in the i18n locale; toLocaleString would use the browser's.
    defaultMessage: '{failed, number} failed ({percent}%)',
    values: {
      failed,
      percent: spans ? Number(((failed / spans) * 100).toPrecision(2)) : 0,
    },
  });
