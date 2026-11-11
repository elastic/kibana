/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldStatsBucket, FieldStatsKind } from '../common';
import { h } from './dom';
import { formatCount, formatDate } from './format';
import { styles } from './styles';

export function formatBucketLabel(kind: FieldStatsKind, bucket: FieldStatsBucket): string {
  return kind === 'date' ? formatDate(bucket.label) : bucket.label;
}

/** Renders a column chart of histogram buckets; clicking a column calls `onSelect`. */
export function renderBarChart(
  kind: FieldStatsKind,
  buckets: readonly FieldStatsBucket[],
  onSelect: (bucket: FieldStatsBucket) => void
): HTMLElement {
  const max = Math.max(1, ...buckets.map(({ count }) => count));

  const bars = buckets.map((bucket) => {
    const label = formatBucketLabel(kind, bucket);
    const bar = h('div', {
      className: [styles.bar, bucket.count === 0 && styles.barEmpty],
      title: `${label}: ${formatCount(bucket.count)}`,
      attrs: {
        role: 'button',
        tabindex: '-1',
        'aria-label': `${label}: ${formatCount(bucket.count)}`,
      },
    });
    bar.style.height = `${Math.max(2, (bucket.count / max) * 100)}%`;
    bar.addEventListener('click', () => onSelect(bucket));
    return bar;
  });

  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  return h('div', {}, [
    h('div', { className: styles.chart }, bars),
    first && last
      ? h('div', { className: styles.axis }, [
          h('span', { text: formatBucketLabel(kind, first) }),
          h('span', { text: `max ${formatCount(max)}` }),
          h('span', { text: formatBucketLabel(kind, last) }),
        ])
      : null,
  ]);
}
