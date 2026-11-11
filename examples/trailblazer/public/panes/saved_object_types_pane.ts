/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectTypeSummary } from '../../common/saved_objects';
import { getErrorMessage, isAbortError } from '../api';
import type { TrailContext } from '../context';
import { textBadge } from '../context';
import { h } from '../dom';
import { formatCount } from '../format';
import type { HiddenToggle } from '../preferences';
import { createHiddenToggle } from '../preferences';
import { SelectList } from '../select_list';
import { styles } from '../styles';
import type { Pane } from '../trail';
import type { TrailStep } from '../trail_state';
import { createPaneShell } from '../trail';

/** Lists the saved object types that have at least one object, across all spaces. */
export class SavedObjectTypesPane implements Pane {
  public readonly element: HTMLElement;
  private readonly list: SelectList<SavedObjectTypeSummary>;
  private readonly status = h('div', { className: styles.status });
  private readonly filterInput: HTMLInputElement;
  private readonly hiddenToggle: HiddenToggle;
  private readonly controller = new AbortController();
  private types: readonly SavedObjectTypeSummary[] = [];

  constructor(private readonly ctx: TrailContext) {
    const shell = createPaneShell({
      kind: 'Kibana',
      title: 'Saved objects',
      onClose: () => ctx.trail.close(this),
    });
    this.element = shell.root;

    this.filterInput = h('input', {
      className: styles.input,
      attrs: { type: 'search', placeholder: 'Filter types', 'aria-label': 'Filter types' },
    });
    this.filterInput.addEventListener('input', () => this.render());
    this.hiddenToggle = createHiddenToggle(ctx.preferences, () => this.render());

    this.list = new SelectList<SavedObjectTypeSummary>({
      label: 'Saved object types',
      emptyText: 'No saved object types match',
      renderRow: (type) => renderTypeRow(type),
      onSelect: (type) => ctx.openSavedObjects(this, type),
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    shell.body.append(
      h('div', { className: styles.section }, [
        this.filterInput,
        h('div', { className: styles.inline }, [this.hiddenToggle.element, this.status]),
      ]),
      this.list.element
    );
    this.load();
  }

  public title() {
    return 'Saved objects';
  }

  public step(): TrailStep {
    return { pane: 'saved_object_types' };
  }

  public focus() {
    this.list.focus();
  }

  public onChildClosed() {
    this.list.clearSelection();
  }

  public destroy() {
    this.controller.abort();
    this.hiddenToggle.destroy();
  }

  private async load() {
    this.status.textContent = 'Loading…';
    try {
      const { types } = await this.ctx.api.getSavedObjectTypes(this.controller.signal);
      this.types = types;
      this.render();
    } catch (error) {
      if (isAbortError(error)) return;
      this.status.textContent = '';
      this.list.showMessage(getErrorMessage(error));
    }
  }

  private render() {
    const filter = this.filterInput.value.trim().toLowerCase();
    const { showHidden } = this.ctx.preferences;
    const visible = this.types.filter(
      ({ name, displayName, hidden, count }) =>
        count > 0 &&
        (showHidden || !hidden) &&
        (!filter ||
          name.toLowerCase().includes(filter) ||
          displayName.toLowerCase().includes(filter))
    );
    const hiddenCount = this.types.filter(({ hidden, count }) => hidden && count > 0).length;
    this.list.setItems(visible);
    this.status.textContent =
      !showHidden && hiddenCount > 0
        ? `${formatCount(visible.length)} types · ${formatCount(hiddenCount)} hidden`
        : `${formatCount(visible.length)} types`;
  }
}

function renderTypeRow({
  name,
  displayName,
  hidden,
  namespaceType,
  count,
}: SavedObjectTypeSummary) {
  const meta = [
    displayName !== name ? name : undefined,
    namespaceType,
    hidden ? 'hidden' : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  return [
    textBadge(hidden ? 'h' : 'so', hidden ? 'Hidden type' : 'Saved object type'),
    h('div', { className: styles.rowMain }, [
      h('div', { className: styles.rowTitle, text: displayName, title: name }),
      h('div', { className: styles.rowMeta, text: meta }),
    ]),
    h('span', { className: styles.count, text: formatCount(count) }),
    h('span', { className: styles.chevron, text: '›' }),
  ];
}
