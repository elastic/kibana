/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { button, h } from './dom';
import { styles } from './styles';
import type { TrailStep } from './trail_state';

export interface Pane {
  readonly element: HTMLElement;
  title(): string;
  /** Describes how to reopen this pane; the root pane has no step. */
  step?(): TrailStep;
  focus(): void;
  /** Called when the pane to the right of this one is closed. */
  onChildClosed?(): void;
  destroy(): void;
}

/** A horizontal sequence of panes where opening a pane replaces everything to the right of its parent. */
export class Trail {
  private readonly panes: Pane[] = [];
  private destroyed = false;

  constructor(
    private readonly trailEl: HTMLElement,
    private readonly crumbsEl: HTMLElement,
    private readonly onChange: (steps: TrailStep[]) => void
  ) {}

  public setRoot(pane: Pane) {
    this.truncate(0);
    this.push(pane);
  }

  /** Opens `child` to the right of `parent`; a parent no longer on the trail gets a destroyed child. */
  public open<P extends Pane>(parent: Pane, child: P): P {
    const index = this.panes.indexOf(parent);
    if (index < 0) {
      child.destroy();
      return child;
    }
    this.truncate(index + 1);
    this.push(child);
    return child;
  }

  public isLast(pane: Pane): boolean {
    return this.panes[this.panes.length - 1] === pane;
  }

  public closeChildren(parent: Pane) {
    const index = this.panes.indexOf(parent);
    if (index >= 0) this.truncate(index + 1);
  }

  public close(pane: Pane) {
    const index = this.panes.indexOf(pane);
    if (index <= 0) return;
    this.truncate(index);
    const parent = this.panes[index - 1];
    parent.onChildClosed?.();
    this.reveal(parent);
  }

  public move(from: Pane, delta: number) {
    const target = this.panes[this.panes.indexOf(from) + delta];
    if (target) this.reveal(target);
  }

  public refreshCrumbs() {
    const crumbs = this.panes.flatMap((pane, index) => {
      const isLast = index === this.panes.length - 1;
      const crumb = button(
        pane.title(),
        isLast ? `${styles.crumb} ${styles.crumbCurrent}` : styles.crumb,
        () => this.reveal(pane)
      );
      crumb.title = pane.title();
      return index === 0
        ? [crumb]
        : [h('span', { text: '›', attrs: { 'aria-hidden': 'true' } }), crumb];
    });
    this.crumbsEl.replaceChildren(...crumbs);
    this.onChange(this.panes.flatMap((pane) => (pane.step ? [pane.step()] : [])));
  }

  public destroy() {
    this.destroyed = true;
    this.truncate(0);
  }

  private reveal(pane: Pane) {
    pane.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    pane.focus();
  }

  private push(pane: Pane) {
    this.panes.push(pane);
    this.trailEl.append(pane.element);
    this.refreshCrumbs();
    requestAnimationFrame(() =>
      pane.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' })
    );
  }

  private truncate(from: number) {
    const removed = this.panes.splice(from);
    for (const pane of removed) {
      pane.destroy();
      pane.element.remove();
    }
    if (removed.length > 0 && !this.destroyed) this.refreshCrumbs();
  }
}

export interface PaneShellOptions {
  readonly kind: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly wide?: boolean;
  readonly onClose?: () => void;
}

export interface PaneShell {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  setHeading(title: string, subtitle?: string): void;
}

/** Builds the common pane chrome: kind label, title, subtitle, close button, and body. */
export function createPaneShell({
  kind,
  title,
  subtitle,
  wide,
  onClose,
}: PaneShellOptions): PaneShell {
  const titleEl = h('div', { className: styles.paneTitle });
  const subtitleEl = h('div', { className: styles.paneSubtitle });
  const body = h('div', { className: styles.paneBody });
  const closeButton = onClose ? button('✕', styles.iconButton, onClose, 'Close pane') : null;

  const root = h(
    'section',
    { className: [styles.pane, wide && styles.paneWide], attrs: { 'aria-label': title } },
    [
      h('header', { className: styles.paneHeader }, [
        h('div', { className: styles.paneHeading }, [
          h('div', { className: styles.paneKind, text: kind }),
          titleEl,
          subtitleEl,
        ]),
        closeButton,
      ]),
      body,
    ]
  );

  function setHeading(nextTitle: string, nextSubtitle?: string) {
    titleEl.textContent = nextTitle;
    titleEl.title = nextTitle;
    subtitleEl.textContent = nextSubtitle ?? '';
    subtitleEl.title = nextSubtitle ?? '';
    subtitleEl.hidden = !nextSubtitle;
    root.setAttribute('aria-label', nextTitle);
  }

  setHeading(title, subtitle);
  return { root, body, setHeading };
}
