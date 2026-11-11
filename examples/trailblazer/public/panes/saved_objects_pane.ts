/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectSummary,
  SavedObjectTarget,
  SavedObjectTypeSummary,
} from '../../common/saved_objects';
import { SAVED_OBJECTS_PAGE_SIZE } from '../../common/saved_objects';
import { getErrorMessage, isAbortError } from '../api';
import type { TrailContext } from '../context';
import { button, debounce, h } from '../dom';
import { formatCount, formatDate } from '../format';
import { SelectList } from '../select_list';
import { styles } from '../styles';
import type { Pane } from '../trail';
import type { TrailStep } from '../trail_state';
import { createPaneShell } from '../trail';

/** Lists the saved objects of one type, across all spaces, most recently updated first. */
export class SavedObjectsPane implements Pane {
  public readonly element: HTMLElement;
  private readonly list: SelectList<SavedObjectSummary>;
  private readonly status = h('div', { className: styles.status });
  private readonly searchInput: HTMLInputElement;
  private objects: readonly SavedObjectSummary[] = [];
  private total = 0;
  private page = 1;
  private controller?: AbortController;

  constructor(private readonly ctx: TrailContext, private readonly type: SavedObjectTypeSummary) {
    const shell = createPaneShell({
      kind: 'Saved object type',
      title: type.displayName,
      subtitle: type.name,
      onClose: () => ctx.trail.close(this),
    });
    this.element = shell.root;

    this.searchInput = h('input', {
      className: styles.input,
      attrs: { type: 'search', placeholder: 'Search by title or text', 'aria-label': 'Search' },
    });
    this.searchInput.addEventListener(
      'input',
      debounce(() => this.load(1), 300)
    );

    this.list = new SelectList<SavedObjectSummary>({
      label: type.displayName,
      emptyText: 'No saved objects match',
      renderRow: (object) => renderSavedObjectRow(object),
      onSelect: (object) => ctx.openSavedObject(this, toTarget(object)),
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    shell.body.append(
      h('div', { className: styles.section }, [this.searchInput, this.status]),
      this.list.element
    );
    this.load(1);
  }

  public title() {
    return this.type.displayName;
  }

  public step(): TrailStep {
    return { pane: 'saved_objects', type: this.type.name };
  }

  public focus() {
    this.list.focus();
  }

  public onChildClosed() {
    this.list.clearSelection();
  }

  public destroy() {
    this.controller?.abort();
  }

  private async load(page: number) {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.status.textContent = 'Loading…';

    try {
      const result = await this.ctx.api.getSavedObjects(
        this.type.name,
        this.searchInput.value.trim(),
        page,
        controller.signal
      );
      this.page = page;
      this.total = result.total;
      if (page === 1) {
        this.objects = result.objects;
        this.list.setItems(result.objects);
      } else {
        this.objects = [...this.objects, ...result.objects];
        this.list.appendItems(result.objects);
      }
      this.status.textContent = `${formatCount(this.total)} objects`;
      this.updateLoadMore();
    } catch (error) {
      if (isAbortError(error)) return;
      this.status.textContent = '';
      this.list.showMessage(getErrorMessage(error));
    }
  }

  private updateLoadMore() {
    const remaining = this.total - this.objects.length;
    this.list.setFooter(
      remaining > 0
        ? button(
            `Load ${formatCount(Math.min(SAVED_OBJECTS_PAGE_SIZE, remaining))} more`,
            styles.linkButton,
            () => this.load(this.page + 1)
          )
        : null
    );
  }
}

/** Picks the space to open an object in; `*` means the object is shared with all spaces. */
export function toTarget({ type, id, spaces }: SavedObjectSummary): SavedObjectTarget {
  const [space] = spaces.filter((candidate) => candidate !== '*');
  return { type, id, space };
}

export function renderSavedObjectRow({ id, title, spaces, updatedAt }: SavedObjectSummary) {
  const meta = [
    title ? id : undefined,
    spaces.length > 0 ? `spaces: ${spaces.join(', ')}` : undefined,
    updatedAt ? formatDate(updatedAt) : undefined,
  ].filter(Boolean);
  return [
    h('div', { className: styles.rowMain }, [
      h('div', { className: styles.rowTitle, text: title ?? id, title: title ?? id }),
      h('div', { className: styles.rowMeta, text: meta.join(' · ') }),
    ]),
    h('span', { className: styles.chevron, text: '›' }),
  ];
}
