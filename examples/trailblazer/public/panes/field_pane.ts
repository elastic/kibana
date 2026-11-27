/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldStatsBucket, FieldStatsResponse } from '../../common';
import { getErrorMessage, isAbortError } from '../api';
import { formatBucketLabel, renderBarChart } from '../bar_chart';
import type { FieldPaneArgs, TrailContext } from '../context';
import { bucketTimeRange, dataViewParams, discoverLink, numericHistogramParams } from '../discover';
import { h } from '../dom';
import { flattenSource, formatCount, formatValue } from '../format';
import type { Condition } from '../query';
import { includeHiddenFor } from '../preferences';
import { refineSearch } from '../query';
import { SelectList } from '../select_list';
import { styles } from '../styles';
import type { Pane } from '../trail';
import type { TrailStep } from '../trail_state';
import { createPaneShell } from '../trail';

const SAMPLE_TOP_VALUES = 20;

type ValueRow =
  | { readonly kind: 'bucket'; readonly bucket: FieldStatsBucket }
  | { readonly kind: 'missing'; readonly count: number };

export class FieldPane implements Pane {
  public readonly element: HTMLElement;
  private readonly summary = h('div', { className: styles.status });
  private readonly chartHost = h('div');
  private readonly list: SelectList<ValueRow>;
  private readonly controller = new AbortController();
  private stats?: FieldStatsResponse;

  constructor(private readonly ctx: TrailContext, private readonly args: FieldPaneArgs) {
    const { field, search } = args;
    const shell = createPaneShell({
      kind: 'Field',
      title: field.name,
      subtitle: `${field.type} · ${search.index}`,
      onClose: () => ctx.trail.close(this),
    });
    this.element = shell.root;

    this.list = new SelectList<ValueRow>({
      label: `Values of ${field.name}`,
      emptyText: 'No values',
      renderRow: (row) => this.renderRow(row),
      onSelect: (row) => this.drillInto(row),
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    shell.body.append(
      h('div', { className: styles.section }, [this.summary, this.chartHost]),
      this.list.element
    );

    if (field.aggregatable) {
      this.load();
    } else {
      this.showSampleValues();
    }
  }

  public title() {
    return this.args.field.name;
  }

  public step(): TrailStep {
    return { pane: 'field', search: this.args.search, field: this.args.field.name };
  }

  public focus() {
    this.list.focus();
  }

  public onChildClosed() {
    this.list.clearSelection();
  }

  public destroy() {
    this.controller.abort();
  }

  private async load() {
    const { search, field } = this.args;
    this.summary.textContent = 'Loading…';
    try {
      const stats = await this.ctx.api.fieldStats(
        {
          ...search,
          includeHidden: includeHiddenFor(this.ctx.preferences, search.index),
          field: field.name,
          fieldType: field.type,
        },
        this.controller.signal
      );
      this.render(stats);
    } catch (error) {
      if (isAbortError(error)) return;
      this.summary.className = styles.error;
      this.summary.textContent = getErrorMessage(error);
      this.list.showMessage('Field statistics are unavailable');
    }
  }

  private render(stats: FieldStatsResponse) {
    this.stats = stats;
    const { kind, totalDocs, missingDocs, buckets } = stats;
    const present = totalDocs - missingDocs;
    this.summary.textContent = `${formatCount(present)} of ${formatCount(
      totalDocs
    )} documents have a value`;

    this.chartHost.replaceChildren(
      ...(kind !== 'terms' && buckets.length > 0
        ? [
            h('div', { className: styles.inline }, [
              h('span', { className: styles.spacer }),
              discoverLink(this.ctx.discover, this.discoverParams(stats)),
            ]),
            renderBarChart(kind, buckets, (bucket) => this.drillInto({ kind: 'bucket', bucket })),
          ]
        : [])
    );

    const rows: ValueRow[] = buckets
      .filter((bucket) => kind === 'terms' || bucket.count > 0)
      .map((bucket) => ({ kind: 'bucket', bucket }));
    if (missingDocs > 0) rows.push({ kind: 'missing', count: missingDocs });
    this.list.setItems(rows);
  }

  private showSampleValues() {
    const { field, sampleHits } = this.args;
    const counts = new Map<string, number>();
    for (const hit of sampleHits) {
      for (const { path, value } of flattenSource(hit.source)) {
        if (path !== field.name) continue;
        const key = formatValue(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const buckets: FieldStatsBucket[] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, SAMPLE_TOP_VALUES)
      .map(([key, count]) => ({ key, label: key, count }));

    this.stats = { kind: 'terms', totalDocs: sampleHits.length, missingDocs: 0, buckets };
    this.summary.textContent = `Not aggregatable — top values from ${formatCount(
      sampleHits.length
    )} loaded documents`;
    this.list.setItems(buckets.map((bucket) => ({ kind: 'bucket', bucket })));
  }

  private renderRow(row: ValueRow) {
    const total = Math.max(1, this.stats?.totalDocs ?? 1);
    const count = row.kind === 'bucket' ? row.bucket.count : row.count;
    const label =
      row.kind === 'bucket'
        ? formatBucketLabel(this.stats?.kind ?? 'terms', row.bucket)
        : '(missing)';
    const meterFill = h('div');
    meterFill.style.width = `${Math.min(100, (count / total) * 100)}%`;

    return [
      h('div', { className: styles.rowMain }, [
        h('div', { className: styles.rowTitle, text: label, title: label }),
        h('div', { className: styles.meter }, [meterFill]),
      ]),
      h('span', {
        className: styles.count,
        text: `${formatCount(count)} · ${((count / total) * 100).toFixed(1)}%`,
      }),
    ];
  }

  private discoverParams({ kind, buckets }: FieldStatsResponse) {
    const { field, search } = this.args;
    const includeHidden = includeHiddenFor(this.ctx.preferences, search.index);
    if (kind === 'date') {
      return dataViewParams({
        search,
        includeHidden,
        timeField: field.name,
        timeRange: bucketTimeRange(buckets),
        columns: [field.name],
      });
    }
    const [first] = buckets;
    const interval =
      first && typeof first.key === 'number' && typeof first.to === 'number'
        ? first.to - first.key
        : undefined;
    if (interval === undefined) return undefined;
    return numericHistogramParams({ search, includeHidden, field: field.name, interval });
  }

  private drillInto(row: ValueRow) {
    const { field, search } = this.args;
    const condition = toCondition(row, field.name, field.type, this.stats?.kind ?? 'terms');
    this.ctx.openIndex(this, refineSearch(search, condition));
  }
}

function toCondition(
  row: ValueRow,
  field: string,
  fieldType: string,
  kind: FieldStatsResponse['kind']
): Condition {
  if (row.kind === 'missing') return { kind: 'missing', field };
  const { bucket } = row;
  if (kind === 'terms') return { kind: 'equals', field, fieldType, value: bucket.key };
  return { kind: 'range', field, gte: bucket.key, lt: bucket.to };
}
