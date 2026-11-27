/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexKind, IndexSummary } from '../../common';
import { getErrorMessage, isAbortError } from '../api';
import type { TrailContext } from '../context';
import { textBadge } from '../context';
import { debounce, h } from '../dom';
import { formatBytes, formatCount, truncate } from '../format';
import type { HiddenToggle } from '../preferences';
import { createHiddenToggle } from '../preferences';
import { SelectList } from '../select_list';
import { styles } from '../styles';
import type { Pane } from '../trail';
import type { TrailStep } from '../trail_state';
import { createPaneShell } from '../trail';

export const INDEX_KIND_PLURALS: Readonly<Record<IndexKind, string>> = {
  index: 'Indices',
  data_stream: 'Data streams',
  alias: 'Aliases',
};

export const INDEX_KIND_BADGES: Readonly<Record<IndexKind, string>> = {
  index: 'idx',
  data_stream: 'ds',
  alias: 'alias',
};

const PLACEHOLDERS: Readonly<Record<IndexKind, string>> = {
  index: 'Filter indices, e.g. logs-*',
  data_stream: 'Filter data streams, e.g. logs-*',
  alias: 'Filter aliases, e.g. .alerts-*',
};

const MAX_TARGETS_SHOWN = 3;

/** Lists the indices, data streams, or aliases in the cluster. */
export class IndexListPane implements Pane {
  public readonly element: HTMLElement;
  private readonly list: SelectList<IndexSummary>;
  private readonly status = h('div', { className: styles.status });
  private readonly patternInput: HTMLInputElement;
  private readonly hiddenToggle: HiddenToggle;
  private controller?: AbortController;

  constructor(private readonly ctx: TrailContext, private readonly kind: IndexKind) {
    const shell = createPaneShell({
      kind: 'Cluster',
      title: INDEX_KIND_PLURALS[kind],
      onClose: () => ctx.trail.close(this),
    });
    this.element = shell.root;

    this.patternInput = h('input', {
      className: styles.input,
      attrs: { type: 'search', placeholder: PLACEHOLDERS[kind], 'aria-label': 'Name pattern' },
    });
    this.patternInput.addEventListener(
      'input',
      debounce(() => this.load(), 300)
    );
    this.patternInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.list.focus();
      }
    });
    this.hiddenToggle = createHiddenToggle(ctx.preferences, () => this.load());

    this.list = new SelectList<IndexSummary>({
      label: INDEX_KIND_PLURALS[kind],
      emptyText: `No ${INDEX_KIND_PLURALS[kind].toLowerCase()} match this pattern`,
      renderRow: (summary) => renderIndexRow(summary),
      onSelect: (summary) =>
        ctx.openIndex(this, { index: summary.name, language: 'kql', query: '' }),
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    shell.body.append(
      h('div', { className: styles.section }, [
        this.patternInput,
        h('div', { className: styles.inline }, [this.hiddenToggle.element, this.status]),
      ]),
      this.list.element
    );

    this.load();
  }

  public title() {
    return INDEX_KIND_PLURALS[this.kind];
  }

  public step(): TrailStep {
    return { pane: 'index_list', kind: this.kind };
  }

  public focus() {
    this.list.focus();
  }

  public onChildClosed() {
    this.list.clearSelection();
  }

  public destroy() {
    this.controller?.abort();
    this.hiddenToggle.destroy();
  }

  private async load() {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.status.textContent = 'Loading…';

    try {
      const pattern = this.patternInput.value.trim() || '*';
      const { indices } = await this.ctx.api.getIndices(
        pattern.includes('*') ? pattern : `*${pattern}*`,
        this.ctx.preferences.showHidden,
        controller.signal
      );
      const matching = indices.filter(({ kind }) => kind === this.kind);
      this.list.setItems(matching);
      this.status.textContent = `${formatCount(matching.length)} found`;
    } catch (error) {
      if (isAbortError(error)) return;
      this.status.textContent = '';
      this.list.showMessage(getErrorMessage(error));
    }
  }
}

function describeTargets({ kind, targets }: IndexSummary): string | undefined {
  if (!targets || targets.length === 0) return undefined;
  if (kind === 'data_stream') {
    return `${formatCount(targets.length)} backing ${targets.length === 1 ? 'index' : 'indices'}`;
  }
  const shown = targets.slice(0, MAX_TARGETS_SHOWN).join(', ');
  const more = targets.length > MAX_TARGETS_SHOWN ? ` +${targets.length - MAX_TARGETS_SHOWN}` : '';
  return `→ ${truncate(shown, 80)}${more}`;
}

function renderIndexRow(summary: IndexSummary) {
  const { name, kind, docsCount, storeSizeBytes, health } = summary;
  const meta = [
    describeTargets(summary),
    docsCount !== undefined ? `${formatCount(docsCount)} docs` : undefined,
    storeSizeBytes !== undefined ? formatBytes(storeSizeBytes) : undefined,
    health,
  ].filter(Boolean);

  return [
    textBadge(INDEX_KIND_BADGES[kind], INDEX_KIND_PLURALS[kind]),
    h('div', { className: styles.rowMain }, [
      h('div', { className: styles.rowTitle, text: name, title: name }),
      h('div', { className: styles.rowMeta, text: meta.join(' · ') }),
    ]),
    h('span', { className: styles.chevron, text: '›' }),
  ];
}
