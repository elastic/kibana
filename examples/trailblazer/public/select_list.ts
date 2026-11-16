/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Child } from './dom';
import { h } from './dom';
import { styles } from './styles';

export interface SelectListOptions<T> {
  readonly label: string;
  readonly emptyText: string;
  renderRow(item: T): readonly Child[];
  /** Returns a heading for the group the item belongs to; a heading is shown where the group changes. */
  groupOf?(item: T): string | undefined;
  onSelect(item: T): void;
  onNavigate?(direction: -1 | 1): void;
}

/**
 * A keyboard-navigable single-selection list. Moving the selection with the arrow keys selects
 * immediately, so the next pane in the trail follows along; left and right move between panes.
 */
export class SelectList<T> {
  public readonly element: HTMLElement;
  private items: readonly T[] = [];
  private rows: HTMLElement[] = [];
  private selectedIndex = -1;
  private readonly footer = h('div');

  constructor(private readonly options: SelectListOptions<T>) {
    this.element = h('div', {
      className: styles.list,
      attrs: { role: 'listbox', tabindex: '0', 'aria-label': options.label },
    });
    this.element.addEventListener('keydown', (event) => this.onKeyDown(event));
  }

  public get size(): number {
    return this.items.length;
  }

  public setItems(items: readonly T[]) {
    this.items = items;
    this.selectedIndex = -1;
    this.rows = items.map((item, index) => this.createRow(item, index));
    this.render();
  }

  public appendItems(items: readonly T[]) {
    const start = this.items.length;
    this.items = [...this.items, ...items];
    this.rows.push(...items.map((item, i) => this.createRow(item, start + i)));
    this.render();
  }

  public setFooter(footer: Child) {
    this.footer.replaceChildren(...(footer ? [footer] : []));
  }

  public showMessage(message: string) {
    this.items = [];
    this.rows = [];
    this.selectedIndex = -1;
    this.element.replaceChildren(h('div', { className: styles.empty, text: message }));
  }

  public clearSelection() {
    this.setSelected(-1);
  }

  public focus() {
    this.element.focus({ preventScroll: true });
  }

  private render() {
    this.element.replaceChildren(
      ...(this.rows.length > 0
        ? this.withGroupHeadings()
        : [h('div', { className: styles.empty, text: this.options.emptyText })]),
      this.footer
    );
  }

  private withGroupHeadings(): HTMLElement[] {
    const { groupOf } = this.options;
    if (!groupOf) return this.rows;
    const elements: HTMLElement[] = [];
    let previous: string | undefined;
    this.items.forEach((item, index) => {
      const group = groupOf(item);
      if (group !== undefined && group !== previous) {
        elements.push(h('div', { className: styles.groupHeading, text: group }));
      }
      previous = group;
      elements.push(this.rows[index]);
    });
    return elements;
  }

  private createRow(item: T, index: number): HTMLElement {
    const row = h(
      'div',
      { className: styles.row, attrs: { role: 'option', 'aria-selected': 'false' } },
      this.options.renderRow(item)
    );
    row.addEventListener('click', () => {
      this.select(index);
      this.focus();
    });
    return row;
  }

  private select(index: number) {
    const item = this.items[index];
    if (item === undefined) return;
    this.setSelected(index);
    this.options.onSelect(item);
  }

  private setSelected(index: number) {
    const previous = this.rows[this.selectedIndex];
    if (previous) {
      previous.classList.remove(styles.rowSelected);
      previous.setAttribute('aria-selected', 'false');
    }
    this.selectedIndex = index;
    const current = this.rows[index];
    if (current) {
      current.classList.add(styles.rowSelected);
      current.setAttribute('aria-selected', 'true');
      current.scrollIntoView({ block: 'nearest' });
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    const last = this.items.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        this.select(Math.min(last, this.selectedIndex + 1));
        break;
      case 'ArrowUp':
        this.select(Math.max(0, this.selectedIndex - 1));
        break;
      case 'Home':
        this.select(0);
        break;
      case 'End':
        this.select(last);
        break;
      case 'Enter':
        this.select(Math.max(0, this.selectedIndex));
        break;
      case 'ArrowRight':
        this.options.onNavigate?.(1);
        break;
      case 'ArrowLeft':
        this.options.onNavigate?.(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
  }
}
