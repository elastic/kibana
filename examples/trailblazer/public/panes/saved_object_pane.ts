/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectAssociation,
  SavedObjectDetailResponse,
  SavedObjectReferenceSummary,
  SavedObjectSummary,
  SavedObjectTarget,
} from '../../common/saved_objects';
import { getErrorMessage, isAbortError } from '../api';
import type { TrailContext } from '../context';
import { textBadge } from '../context';
import { button, h } from '../dom';
import { flattenSource, formatCount, formatValue } from '../format';
import { SelectList } from '../select_list';
import { styles } from '../styles';
import type { Pane, PaneShell } from '../trail';
import type { TrailStep } from '../trail_state';
import { createPaneShell } from '../trail';
import { toTarget } from './saved_objects_pane';

type Relation =
  | { readonly kind: 'reference'; readonly reference: SavedObjectReferenceSummary }
  | { readonly kind: 'referenced_by'; readonly object: SavedObjectSummary }
  | { readonly kind: 'association'; readonly association: SavedObjectAssociation };

type Tab = 'relations' | 'attributes' | 'json';

const ASSOCIATION_BADGES: Readonly<Record<SavedObjectAssociation['kind'], string>> = {
  event_log: 'ev',
  alerts: 'al',
};

/** One saved object: its references in both directions, plus its event log entries and alerts. */
export class SavedObjectPane implements Pane {
  public readonly element: HTMLElement;
  private readonly shell: PaneShell;
  private readonly relations: SelectList<Relation>;
  private readonly status = h('div', { className: styles.status });
  private readonly tabsEl = h('div', { className: styles.tabs, attrs: { role: 'tablist' } });
  private readonly contentHost = h('div', { className: styles.paneBody });
  private readonly controller = new AbortController();
  private detail?: SavedObjectDetailResponse;
  private activeTab: Tab = 'relations';
  private groupLabels = new Map<Relation['kind'], string>();

  constructor(private readonly ctx: TrailContext, private readonly target: SavedObjectTarget) {
    this.shell = createPaneShell({
      kind: target.type,
      title: target.id,
      subtitle: describeTarget(target),
      wide: true,
      onClose: () => ctx.trail.close(this),
    });
    this.element = this.shell.root;

    this.relations = new SelectList<Relation>({
      label: 'Relations',
      emptyText: 'No references, referrers, event log entries, or alerts',
      renderRow: (relation) => renderRelationRow(relation),
      groupOf: (relation) => this.groupLabels.get(relation.kind),
      onSelect: (relation) => this.open(relation),
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    this.shell.body.append(
      h('div', { className: styles.section }, [this.tabsEl, this.status]),
      this.contentHost
    );
    this.renderTabs();
    this.load();
  }

  public title() {
    return this.detail?.object.title ?? this.target.id;
  }

  public step(): TrailStep {
    return { pane: 'saved_object', target: this.target };
  }

  public focus() {
    if (this.activeTab === 'relations') this.relations.focus();
    else this.contentHost.querySelector<HTMLElement>('[tabindex]')?.focus();
  }

  public onChildClosed() {
    this.relations.clearSelection();
  }

  public destroy() {
    this.controller.abort();
  }

  private async load() {
    this.status.textContent = 'Loading…';
    try {
      const detail = await this.ctx.api.getSavedObject(this.target, this.controller.signal);
      this.detail = detail;
      this.shell.setHeading(this.title(), describeTarget(this.target));
      this.ctx.trail.refreshCrumbs();
      this.status.textContent = '';
      this.renderRelations(detail);
      this.renderTabs();
    } catch (error) {
      if (isAbortError(error)) return;
      this.status.className = styles.error;
      this.status.textContent = getErrorMessage(error);
      this.relations.showMessage('This saved object could not be loaded');
    }
  }

  private renderRelations({
    references,
    referencedBy,
    referencedByTotal,
    associations,
  }: SavedObjectDetailResponse) {
    const shownAssociations = associations.filter(({ count, error }) => error || (count ?? 0) > 0);
    const truncated =
      referencedByTotal > referencedBy.length
        ? ` (showing ${formatCount(referencedBy.length)} of ${formatCount(referencedByTotal)})`
        : ` (${formatCount(referencedByTotal)})`;
    this.groupLabels = new Map([
      ['reference', `References (${formatCount(references.length)})`],
      ['referenced_by', `Referenced by${truncated}`],
      ['association', 'Event log and alerts'],
    ]);
    this.relations.setItems([
      ...references.map((reference): Relation => ({ kind: 'reference', reference })),
      ...referencedBy.map((object): Relation => ({ kind: 'referenced_by', object })),
      ...shownAssociations.map((association): Relation => ({ kind: 'association', association })),
    ]);
  }

  private open(relation: Relation) {
    switch (relation.kind) {
      case 'reference': {
        const { type, id, space } = relation.reference;
        this.ctx.openSavedObject(this, { type, id, space: space ?? this.target.space });
        return;
      }
      case 'referenced_by':
        this.ctx.openSavedObject(this, toTarget(relation.object));
        return;
      case 'association': {
        const { index, query } = relation.association;
        this.ctx.openIndex(this, { index, language: 'kql', query });
      }
    }
  }

  private renderTabs() {
    const attributeCount = this.detail ? flattenSource(this.detail.object.attributes).length : 0;
    const relationCount = this.relations.size;
    const tabs: ReadonlyArray<[Tab, string]> = [
      ['relations', `Relations (${formatCount(relationCount)})`],
      ['attributes', `Attributes (${formatCount(attributeCount)})`],
      ['json', 'JSON'],
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

    switch (this.activeTab) {
      case 'relations':
        this.contentHost.replaceChildren(this.relations.element);
        return;
      case 'attributes':
        this.contentHost.replaceChildren(renderAttributes(this.detail?.object.attributes ?? {}));
        return;
      case 'json':
        this.contentHost.replaceChildren(
          h('pre', {
            className: styles.json,
            text: JSON.stringify(this.detail?.object.raw ?? {}, null, 2),
            attrs: { tabindex: '0' },
          })
        );
    }
  }
}

function describeTarget({ type, id, space }: SavedObjectTarget): string {
  return [type, id, space ? `space: ${space}` : undefined].filter(Boolean).join(' · ');
}

function renderRelationRow(relation: Relation) {
  switch (relation.kind) {
    case 'reference': {
      const { name, type, id, title, missing, implicit } = relation.reference;
      return [
        textBadge('→', implicit ? 'References (from an attribute)' : 'References'),
        h('div', { className: [styles.rowMain, missing && styles.rowMissing] }, [
          h('div', { className: styles.rowTitle, text: title ?? id, title: title ?? id }),
          h('div', {
            className: styles.rowMeta,
            text: [
              type,
              implicit ? `attribute ${name}` : name,
              missing ? 'missing' : title ? id : undefined,
            ]
              .filter(Boolean)
              .join(' · '),
          }),
        ]),
        h('span', { className: styles.chevron, text: '›' }),
      ];
    }
    case 'referenced_by': {
      const { type, id, title } = relation.object;
      return [
        textBadge('←', 'Referenced by'),
        h('div', { className: styles.rowMain }, [
          h('div', { className: styles.rowTitle, text: title ?? id, title: title ?? id }),
          h('div', {
            className: styles.rowMeta,
            text: [type, title ? id : undefined].filter(Boolean).join(' · '),
          }),
        ]),
        h('span', { className: styles.chevron, text: '›' }),
      ];
    }
    case 'association': {
      const { kind, label, index, count, error } = relation.association;
      return [
        textBadge(ASSOCIATION_BADGES[kind], kind === 'event_log' ? 'Event log' : 'Alerts'),
        h('div', { className: styles.rowMain }, [
          h('div', { className: styles.rowTitle, text: label, title: label }),
          error
            ? h('div', { className: styles.error, text: error })
            : h('div', { className: styles.rowMeta, text: index }),
        ]),
        count !== undefined
          ? h('span', { className: styles.count, text: formatCount(count) })
          : null,
        h('span', { className: styles.chevron, text: '›' }),
      ];
    }
  }
}

function renderAttributes(attributes: Record<string, unknown>): HTMLElement {
  const fields = flattenSource(attributes);
  return h(
    'div',
    { className: styles.list, attrs: { tabindex: '0', 'aria-label': 'Attributes' } },
    fields.length > 0
      ? fields.map(({ path, value }) =>
          h('div', { className: styles.staticRow }, [
            h('div', { className: styles.rowMain }, [
              h('div', { className: styles.rowMeta, text: path, title: path }),
              h('div', { className: styles.rowValue, text: formatValue(value) }),
            ]),
          ])
        )
      : [h('div', { className: styles.empty, text: 'No attributes' })]
  );
}
