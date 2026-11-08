/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexKind } from '../../common';
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
import { createPaneShell } from '../trail';
import { INDEX_KIND_BADGES, INDEX_KIND_PLURALS } from './index_list_pane';

type CategoryId = IndexKind | 'saved_objects';

interface Category {
  readonly id: CategoryId;
  readonly count?: number;
  readonly error?: string;
}

const CATEGORY_ORDER: readonly CategoryId[] = ['index', 'data_stream', 'alias', 'saved_objects'];

const CATEGORY_LABELS: Readonly<Record<CategoryId, string>> = {
  ...INDEX_KIND_PLURALS,
  saved_objects: 'Saved objects',
};

const CATEGORY_BADGES: Readonly<Record<CategoryId, string>> = {
  ...INDEX_KIND_BADGES,
  saved_objects: 'so',
};

/** The root of the trail: the kinds of things in the cluster that can be browsed. */
export class ClusterPane implements Pane {
  public readonly element: HTMLElement;
  private readonly list: SelectList<Category>;
  private readonly hiddenToggle: HiddenToggle;
  private controller?: AbortController;

  constructor(private readonly ctx: TrailContext) {
    const shell = createPaneShell({ kind: 'Kibana', title: 'Cluster' });
    this.element = shell.root;
    this.hiddenToggle = createHiddenToggle(ctx.preferences, () => this.load());

    this.list = new SelectList<Category>({
      label: 'Cluster',
      emptyText: 'Nothing to browse',
      renderRow: (category) => renderCategoryRow(category),
      onSelect: ({ id }) => {
        if (id === 'saved_objects') ctx.openSavedObjectTypes(this);
        else ctx.openIndexList(this, id);
      },
      onNavigate: (direction) => ctx.trail.move(this, direction),
    });

    shell.body.append(
      h('div', { className: styles.section }, [this.hiddenToggle.element]),
      this.list.element
    );
    this.list.setItems(CATEGORY_ORDER.map((id) => ({ id })));
    this.load();
  }

  public title() {
    return 'Cluster';
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
    const { api, preferences } = this.ctx;

    const [indices, savedObjects] = await Promise.allSettled([
      api.getIndices('*', preferences.showHidden, controller.signal),
      api.getSavedObjectTypes(controller.signal),
    ]);
    if (controller.signal.aborted) return;

    const categories = CATEGORY_ORDER.map((id): Category => {
      if (id === 'saved_objects') {
        return savedObjects.status === 'fulfilled'
          ? { id, count: savedObjects.value.total }
          : { id, error: describeFailure(savedObjects.reason) };
      }
      return indices.status === 'fulfilled'
        ? { id, count: indices.value.indices.filter(({ kind }) => kind === id).length }
        : { id, error: describeFailure(indices.reason) };
    });
    this.list.setItems(categories);
  }
}

function describeFailure(reason: unknown): string | undefined {
  return isAbortError(reason) ? undefined : getErrorMessage(reason);
}

function renderCategoryRow({ id, count, error }: Category) {
  return [
    textBadge(CATEGORY_BADGES[id], CATEGORY_LABELS[id]),
    h('div', { className: styles.rowMain }, [
      h('div', { className: styles.rowTitle, text: CATEGORY_LABELS[id] }),
      error ? h('div', { className: styles.error, text: error }) : null,
    ]),
    count !== undefined ? h('span', { className: styles.count, text: formatCount(count) }) : null,
    h('span', { className: styles.chevron, text: '›' }),
  ];
}
