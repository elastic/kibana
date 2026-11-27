/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocumentAssociation } from '../../common/associations';
import { findDocumentAssociations } from '../../common/associations';
import type { DocumentPaneArgs, TrailContext } from '../context';
import { fieldTypeBadge, textBadge } from '../context';
import { button, h } from '../dom';
import type { FlatField } from '../format';
import { flattenSource, formatValue } from '../format';
import type { Condition } from '../query';
import { refineSearch } from '../query';
import { SelectList } from '../select_list';
import { styles } from '../styles';
import type { Pane } from '../trail';
import type { TrailStep } from '../trail_state';
import { createPaneShell } from '../trail';

type Tab = 'fields' | 'related' | 'json';

export class DocumentPane implements Pane {
  public readonly element: HTMLElement;
  private readonly fields: readonly FlatField[];
  private readonly list: SelectList<FlatField>;
  private readonly associations: readonly DocumentAssociation[];
  private readonly related: SelectList<DocumentAssociation>;
  private readonly filterInput: HTMLInputElement;
  private readonly tabsEl = h('div', { className: styles.tabs, attrs: { role: 'tablist' } });
  private readonly contentHost = h('div', { className: styles.paneBody });
  private readonly json: HTMLElement;
  private activeTab: Tab = 'fields';

  constructor(private readonly ctx: TrailContext, private readonly args: DocumentPaneArgs) {
    const { hit } = args;
    const shell = createPaneShell({
      kind: 'Document',
      title: hit.id,
      subtitle: hit.index,
      wide: true,
      onClose: () => ctx.trail.close(this),
    });
    this.element = shell.root;
    this.fields = flattenSource(hit.source);
    this.associations = findDocumentAssociations(hit.source);

    this.filterInput = h('input', {
      className: styles.input,
      attrs: {
        type: 'search',
        placeholder: 'Filter fields and values',
        'aria-label': 'Filter fields',
      },
    });
    this.filterInput.addEventListener('input', () => this.renderFields());

    this.list = new SelectList<FlatField>({
      label: 'Document fields',
      emptyText: 'No fields match',
      renderRow: (field) => this.renderRow(field),
      onSelect: (field) => this.drillInto(field),
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    this.related = new SelectList<DocumentAssociation>({
      label: 'Related saved objects and searches',
      emptyText: 'No related saved objects',
      renderRow: (association) => renderAssociationRow(association),
      onSelect: (association) => this.openAssociation(association),
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });
    this.related.setItems(this.associations);

    this.json = h('pre', {
      className: styles.json,
      text: JSON.stringify(hit.source, null, 2),
      attrs: { tabindex: '0' },
    });

    shell.body.append(
      h('div', { className: styles.section }, [
        this.tabsEl,
        h('div', {
          className: styles.rowMeta,
          text: 'Select a value to find documents that share it',
        }),
      ]),
      this.contentHost
    );
    this.renderFields();
    this.renderTabs();
  }

  public title() {
    return this.args.hit.id;
  }

  public step(): TrailStep {
    const { search, hit } = this.args;
    return { pane: 'document', search, index: hit.index, id: hit.id };
  }

  public focus() {
    if (this.activeTab === 'fields') this.list.focus();
    else if (this.activeTab === 'related') this.related.focus();
    else this.json.focus();
  }

  public onChildClosed() {
    this.list.clearSelection();
    this.related.clearSelection();
  }

  public destroy() {}

  private renderTabs() {
    const tabs: ReadonlyArray<[Tab, string]> = [
      ['fields', `Fields (${this.fields.length})`],
      ...(this.associations.length > 0
        ? [['related', `Related (${this.associations.length})`] as [Tab, string]]
        : []),
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

    if (this.activeTab === 'fields') {
      this.contentHost.replaceChildren(
        h('div', { className: styles.section }, [this.filterInput]),
        this.list.element
      );
    } else if (this.activeTab === 'related') {
      this.contentHost.replaceChildren(this.related.element);
    } else {
      this.contentHost.replaceChildren(this.json);
    }
  }

  private renderFields() {
    const filter = this.filterInput.value.trim().toLowerCase();
    this.list.setItems(
      filter
        ? this.fields.filter(
            ({ path, value }) =>
              path.toLowerCase().includes(filter) ||
              formatValue(value).toLowerCase().includes(filter)
          )
        : this.fields
    );
  }

  private renderRow(field: FlatField) {
    const summary = this.args.info.fieldsByName.get(field.path);
    const statsButton = button(
      '▥',
      styles.iconButton,
      (event) => {
        event.stopPropagation();
        if (summary) {
          this.ctx.openField(this, { ...this.args, field: summary, sampleHits: [this.args.hit] });
        }
      },
      summary ? `Show value distribution for ${field.path}` : `${field.path} is not mapped`
    );
    statsButton.disabled = !summary;

    return [
      fieldTypeBadge(summary?.type),
      h('div', { className: styles.rowMain }, [
        h('div', { className: styles.rowMeta, text: field.path, title: field.path }),
        h('div', { className: styles.rowValue, text: formatValue(field.value) }),
      ]),
      statsButton,
    ];
  }

  private drillInto({ path, value }: FlatField) {
    const condition: Condition =
      value === null
        ? { kind: 'missing', field: path }
        : {
            kind: 'equals',
            field: path,
            fieldType: this.args.info.fieldsByName.get(path)?.type,
            value,
          };
    this.ctx.openIndex(this, refineSearch(this.args.search, condition));
  }

  private openAssociation(association: DocumentAssociation) {
    if (association.kind === 'saved_object') {
      this.ctx.openSavedObject(this, association.target);
    } else {
      const { index, query } = association;
      this.ctx.openIndex(this, { index, language: 'kql', query });
    }
  }
}

function renderAssociationRow(association: DocumentAssociation) {
  const isSavedObject = association.kind === 'saved_object';
  const meta = isSavedObject
    ? [association.target.type, association.target.id, association.target.space]
        .filter(Boolean)
        .join(' · ')
    : `${association.index} · ${association.query}`;
  return [
    textBadge(isSavedObject ? 'so' : 'q', isSavedObject ? 'Saved object' : 'Search'),
    h('div', { className: styles.rowMain }, [
      h('div', { className: styles.rowTitle, text: association.label }),
      h('div', { className: styles.rowMeta, text: meta, title: meta }),
    ]),
    h('span', { className: styles.chevron, text: '›' }),
  ];
}
