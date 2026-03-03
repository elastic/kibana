/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, within } from '@testing-library/react';

import { EuiContextMenuTestHarness } from './eui_context_menu_test_harness';

type Root = Document | HTMLElement;

/**
 * Finder for EUI popover panels (`[data-popover-panel]`).
 *
 * EuiPopoverPanel renders a stable `data-popover-panel` attribute (see EUI source).
 *
 * This harness is intentionally discovery-focused and returns `HTMLElement`s and/or
 * other harness instances that operate on a specific panel.
 */
export class EuiPopoverPanelTestHarness {
  #root: Root;

  constructor(root: Root = document) {
    this.#root = root;
  }

  /**
   * EuiPopover panels are marked with the stable attribute `data-popover-panel`.
   */
  public getOpenPanels(): HTMLElement[] {
    const rootEl = this.#root instanceof HTMLElement ? this.#root : document.body;
    return Array.from(rootEl.querySelectorAll<HTMLElement>('[data-popover-panel]'));
  }

  public getTopOpenPanel(): HTMLElement | null {
    const panels = this.getOpenPanels();
    return panels[panels.length - 1] ?? null;
  }

  public async findTopOpenPanel(): Promise<HTMLElement> {
    return await waitFor(() => {
      const top = this.getTopOpenPanel();
      if (!top) throw new Error('Expected an open popover panel');
      return top;
    });
  }

  public async findPanelContainingMenuItem(label: string | RegExp): Promise<HTMLElement> {
    return await waitFor(() => {
      const panels = this.getOpenPanels();
      if (panels.length === 0) throw new Error('Expected an open popover panel');

      const matching = panels.find((panel) => {
        const button = within(panel).queryByRole('button', { name: label });
        const link = within(panel).queryByRole('link', { name: label });
        return !!button || !!link;
      });

      if (!matching) {
        throw new Error(`Expected an open popover panel containing "${String(label)}"`);
      }

      return matching;
    });
  }

  public async findContextMenuContainingItem(
    label: string | RegExp
  ): Promise<EuiContextMenuTestHarness> {
    const panel = await this.findPanelContainingMenuItem(label);
    return new EuiContextMenuTestHarness(panel);
  }
}
