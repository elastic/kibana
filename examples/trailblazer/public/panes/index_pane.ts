/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldStatsResponse, FieldSummary, QueryLanguage, SearchHit } from '../../common';
import { QUERY_LANGUAGES } from '../../common';
import { getErrorMessage, isAbortError } from '../api';
import { renderBarChart } from '../bar_chart';
import type { IndexInfo, TrailContext } from '../context';
import { fieldTypeBadge, toIndexInfo } from '../context';
import { bucketTimeRange, dataViewParams, discoverLink } from '../discover';
import { button, h } from '../dom';
import {
  flattenSource,
  formatCount,
  formatDate,
  formatValue,
  getFieldValue,
  truncate,
} from '../format';
import type { SearchState } from '../query';
import { includeHiddenFor } from '../preferences';
import { LANGUAGE_LABELS, refineSearch } from '../query';
import { SelectList } from '../select_list';
import { styles } from '../styles';
import type { Pane, PaneShell } from '../trail';
import type { TrailStep } from '../trail_state';
import { createPaneShell } from '../trail';

const PAGE_SIZE = 50;
const SUMMARY_FIELDS = 6;

const PLACEHOLDERS: Readonly<Record<QueryLanguage, string>> = {
  kql: 'KQL, e.g. event.outcome: "failure" — Enter to run',
  lucene: 'Lucene, e.g. status:500 AND host:web* — Enter to run',
  dsl: '{"term": {"event.outcome": "failure"}} — ⌘/Ctrl+Enter to run',
};

type Tab = 'documents' | 'fields';

export class IndexPane implements Pane {
  public readonly element: HTMLElement;
  private readonly shell: PaneShell;
  private readonly languageSelect: HTMLSelectElement;
  private readonly queryInput: HTMLTextAreaElement;
  private readonly status = h('div', { className: styles.status });
  private readonly chartSection = h('div', { className: styles.section });
  private readonly tabsEl = h('div', { className: styles.tabs, attrs: { role: 'tablist' } });
  private readonly listHost = h('div', { className: styles.paneBody });
  private readonly fieldFilter: HTMLInputElement;
  private readonly documentList: SelectList<SearchHit>;
  private readonly fieldList: SelectList<FieldSummary>;
  private info?: IndexInfo;
  private hits: readonly SearchHit[] = [];
  private total = 0;
  private activeTab: Tab = 'documents';
  private controller?: AbortController;

  constructor(private readonly ctx: TrailContext, private search: SearchState) {
    this.shell = createPaneShell({
      kind: 'Search',
      title: search.index,
      subtitle: describeSearch(search),
      wide: true,
      onClose: () => ctx.trail.close(this),
    });
    this.element = this.shell.root;

    this.languageSelect = h(
      'select',
      { className: styles.select, attrs: { 'aria-label': 'Query language' } },
      QUERY_LANGUAGES.map((language) =>
        h('option', { text: LANGUAGE_LABELS[language], attrs: { value: language } })
      )
    );
    this.languageSelect.value = search.language;
    this.languageSelect.addEventListener('change', () => this.updatePlaceholder());

    this.queryInput = h('textarea', {
      className: styles.textarea,
      attrs: { rows: '2', spellcheck: 'false', 'aria-label': 'Query' },
    });
    this.queryInput.value = search.query;
    this.queryInput.addEventListener('keydown', (event) => this.onQueryKeyDown(event));
    this.updatePlaceholder();

    this.fieldFilter = h('input', {
      className: styles.input,
      attrs: { type: 'search', placeholder: 'Filter fields', 'aria-label': 'Filter fields' },
    });
    this.fieldFilter.addEventListener('input', () => this.renderFields());

    this.documentList = new SelectList<SearchHit>({
      label: 'Documents',
      emptyText: 'No documents match this query',
      renderRow: (hit) => this.renderDocumentRow(hit),
      onSelect: (hit) => {
        if (this.info) ctx.openDocument(this, { search: this.search, info: this.info, hit });
      },
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    this.fieldList = new SelectList<FieldSummary>({
      label: 'Fields',
      emptyText: 'No fields',
      renderRow: (field) => renderFieldRow(field),
      onSelect: (field) => {
        if (this.info) {
          ctx.openField(this, {
            search: this.search,
            info: this.info,
            field,
            sampleHits: this.hits,
          });
        }
      },
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    this.chartSection.hidden = true;
    this.shell.body.append(
      h('div', { className: styles.section }, [
        h('div', { className: styles.inline }, [
          this.languageSelect,
          h('span', { className: styles.spacer }),
          button('Run', styles.primaryButton, () => this.submit()),
        ]),
        this.queryInput,
        this.status,
      ]),
      this.chartSection,
      h('div', { className: styles.section }, [this.tabsEl]),
      this.listHost
    );

    this.renderTabs();
    this.load();
  }

  public title() {
    return this.search.index;
  }

  public step(): TrailStep {
    return { pane: 'index', search: this.search };
  }

  public focus() {
    (this.activeTab === 'documents' ? this.documentList : this.fieldList).focus();
  }

  public onChildClosed() {
    this.documentList.clearSelection();
    this.fieldList.clearSelection();
  }

  public destroy() {
    this.controller?.abort();
  }

  private updatePlaceholder() {
    this.queryInput.placeholder = PLACEHOLDERS[this.languageSelect.value as QueryLanguage];
  }

  private onQueryKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    const isDsl = this.languageSelect.value === 'dsl';
    const wantsSubmit = isDsl ? event.metaKey || event.ctrlKey : !event.shiftKey;
    if (!wantsSubmit) return;
    event.preventDefault();
    this.submit();
  }

  private submit() {
    this.search = {
      ...this.search,
      language: this.languageSelect.value as QueryLanguage,
      query: this.queryInput.value,
    };
    this.shell.setHeading(this.search.index, describeSearch(this.search));
    this.ctx.trail.closeChildren(this);
    this.ctx.trail.refreshCrumbs();
    this.load();
  }

  private newRequest(): AbortSignal {
    this.controller?.abort();
    this.controller = new AbortController();
    return this.controller.signal;
  }

  private async load() {
    const signal = this.newRequest();
    const { index, language, query } = this.search;
    const includeHidden = includeHiddenFor(this.ctx.preferences, index);
    this.setStatus('Searching…');

    try {
      const info =
        this.info ?? toIndexInfo(await this.ctx.api.getFields(index, includeHidden, signal));
      this.info = info;
      const { timeField } = info;

      const [result, histogram] = await Promise.all([
        this.ctx.api.search(
          { index, includeHidden, language, query, size: PAGE_SIZE, from: 0, sortField: timeField },
          signal
        ),
        timeField
          ? this.ctx.api
              .fieldStats(
                {
                  index,
                  includeHidden,
                  language,
                  query,
                  field: timeField,
                  fieldType: info.fieldsByName.get(timeField)?.type ?? 'date',
                },
                signal
              )
              .catch(() => undefined)
          : undefined,
      ]);

      this.hits = result.hits;
      this.total = result.total;
      this.setStatus(`${formatCount(result.total)} hits · ${formatCount(result.took)} ms`);
      this.renderChart(histogram);
      this.documentList.setItems(result.hits);
      this.updateLoadMore();
      this.renderFields();
      this.renderTabs();
    } catch (error) {
      if (isAbortError(error)) return;
      this.setStatus(getErrorMessage(error), true);
      this.chartSection.hidden = true;
      this.hits = [];
      this.total = 0;
      this.documentList.showMessage('Fix the query and run it again');
      this.renderTabs();
    }
  }

  private async loadMore() {
    const signal = this.newRequest();
    const { index, language, query } = this.search;
    const includeHidden = includeHiddenFor(this.ctx.preferences, index);
    try {
      const result = await this.ctx.api.search(
        {
          index,
          includeHidden,
          language,
          query,
          size: PAGE_SIZE,
          from: this.hits.length,
          sortField: this.info?.timeField,
        },
        signal
      );
      this.hits = [...this.hits, ...result.hits];
      this.documentList.appendItems(result.hits);
      this.updateLoadMore();
    } catch (error) {
      if (isAbortError(error)) return;
      this.setStatus(getErrorMessage(error), true);
    }
  }

  private updateLoadMore() {
    const remaining = this.total - this.hits.length;
    this.documentList.setFooter(
      remaining > 0
        ? button(
            `Load ${formatCount(Math.min(PAGE_SIZE, remaining))} more (${formatCount(
              remaining
            )} remaining)`,
            styles.linkButton,
            () => this.loadMore()
          )
        : null
    );
  }

  private setStatus(text: string, isError = false) {
    this.status.textContent = text;
    this.status.className = isError ? styles.error : styles.status;
  }

  private renderChart(histogram: FieldStatsResponse | undefined) {
    const timeField = this.info?.timeField;
    if (!histogram || !timeField || histogram.buckets.length === 0) {
      this.chartSection.hidden = true;
      return;
    }
    this.chartSection.hidden = false;
    const link = discoverLink(
      this.ctx.discover,
      dataViewParams({
        search: this.search,
        includeHidden: includeHiddenFor(this.ctx.preferences, this.search.index),
        timeField,
        timeRange: bucketTimeRange(histogram.buckets),
      })
    );
    this.chartSection.replaceChildren(
      h('div', { className: styles.inline }, [
        h('div', { className: styles.rowMeta, text: `${timeField} · click a bar to drill in` }),
        h('span', { className: styles.spacer }),
        link,
      ]),
      renderBarChart(histogram.kind, histogram.buckets, (bucket) =>
        this.ctx.openIndex(
          this,
          refineSearch(this.search, {
            kind: 'range',
            field: timeField,
            gte: bucket.key,
            lt: bucket.to,
          })
        )
      )
    );
  }

  private renderTabs() {
    const tabs: ReadonlyArray<[Tab, string]> = [
      ['documents', `Documents (${formatCount(this.hits.length)})`],
      ['fields', `Fields (${formatCount(this.info?.fields.length ?? 0)})`],
    ];
    this.tabsEl.replaceChildren(
      ...tabs.map(([tab, label]) => {
        const isActive = tab === this.activeTab;
        const tabButton = button(
          label,
          isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab,
          () => {
            this.activeTab = tab;
            this.renderTabs();
            this.focus();
          }
        );
        tabButton.setAttribute('role', 'tab');
        tabButton.setAttribute('aria-selected', String(isActive));
        return tabButton;
      })
    );

    if (this.activeTab === 'documents') {
      this.listHost.replaceChildren(this.documentList.element);
    } else {
      this.listHost.replaceChildren(
        h('div', { className: styles.section }, [this.fieldFilter]),
        this.fieldList.element
      );
    }
  }

  private renderFields() {
    const filter = this.fieldFilter.value.trim().toLowerCase();
    const fields = this.info?.fields ?? [];
    this.fieldList.setItems(
      filter ? fields.filter(({ name }) => name.toLowerCase().includes(filter)) : fields
    );
  }

  private renderDocumentRow(hit: SearchHit) {
    const timeField = this.info?.timeField;
    const timestamp = timeField ? getFieldValue(hit.source, timeField) : undefined;
    const heading =
      typeof timestamp === 'string' || typeof timestamp === 'number'
        ? formatDate(timestamp)
        : hit.id;
    const summary = flattenSource(hit.source)
      .filter(({ path }) => path !== timeField)
      .slice(0, SUMMARY_FIELDS)
      .map(({ path, value }) => `${path}: ${truncate(formatValue(value), 60)}`)
      .join(' · ');

    return [
      h('div', { className: styles.rowMain }, [
        h('div', { className: styles.rowTitle, text: heading, title: `${hit.index} / ${hit.id}` }),
        h('div', { className: styles.rowMeta, text: summary || '(empty document)' }),
      ]),
      h('span', { className: styles.chevron, text: '›' }),
    ];
  }
}

function renderFieldRow(field: FieldSummary) {
  const notes = [
    field.conflictingTypes ? `conflict: ${field.conflictingTypes.join(', ')}` : undefined,
    field.aggregatable ? undefined : 'not aggregatable',
  ].filter(Boolean);

  return [
    fieldTypeBadge(field.type),
    h('div', { className: styles.rowMain }, [
      h('div', {
        className: styles.rowTitle,
        text: field.name,
        title: `${field.name} (${field.type})`,
      }),
      notes.length > 0 ? h('div', { className: styles.rowMeta, text: notes.join(' · ') }) : null,
    ]),
    h('span', { className: styles.chevron, text: '›' }),
  ];
}

function describeSearch({ language, query }: SearchState): string {
  const trimmed = query.trim();
  return trimmed ? `${LANGUAGE_LABELS[language]}: ${trimmed}` : 'All documents';
}
