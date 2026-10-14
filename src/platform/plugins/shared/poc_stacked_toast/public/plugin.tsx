/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart, Plugin } from '@kbn/core/public';
import { createRoot, type Root } from 'react-dom/client';
import { POC_STACKED_TOAST_ADD_EVENT } from './poc_toast/poc_toast_events';
import { createRandomPocToastInput } from './poc_toast/poc_toast_random';
import { PocToastControls } from './poc_toast/poc_toast_controls';
import { PocToastStack } from './poc_toast/poc_toast_stack';
import type { PocToast, PocToastInput, PocToastPlacement } from './poc_toast/poc_toast_types';

const PLACEMENT_STORAGE_KEY = 'pocStackedToast:placement';
let nextToastId = 0;

export class PocStackedToastPlugin implements Plugin {
  private core: CoreStart | undefined;
  private reactRoot: Root | undefined;
  private toastHost: HTMLDivElement | undefined;
  private toasts: PocToast[] = [];
  private placement: PocToastPlacement =
    localStorage.getItem(PLACEMENT_STORAGE_KEY) === 'top-right' ? 'top-right' : 'top-center';

  public setup() {
    return {};
  }

  private render = () => {
    if (!this.reactRoot || !this.core) {
      return;
    }
    this.reactRoot.render(
      this.core.rendering.addContext(
        <>
          <PocToastStack
            toasts={this.toasts}
            placement={this.placement}
            onDismiss={this.dismissToast}
            onClearAll={this.clearAll}
          />
          <PocToastControls
            placement={this.placement}
            onAdd={this.addRandomToast}
            onPlacementChange={this.setPlacement}
          />
        </>
      )
    );
  };

  private setToasts = (toasts: PocToast[]) => {
    this.toasts = toasts;
    this.render();
  };

  private setPlacement = (placement: PocToastPlacement) => {
    this.placement = placement;
    localStorage.setItem(PLACEMENT_STORAGE_KEY, placement);
    this.render();
  };

  private addToast = (input: PocToastInput) =>
    this.setToasts([...this.toasts, { id: String(nextToastId++), ...input }]);

  private addRandomToast = () => this.addToast(createRandomPocToastInput());

  /** Removes toast from state; {@link PocToastStack} runs exit via `AnimatePresence`. */
  private dismissToast = (id: string) =>
    this.setToasts(this.toasts.filter((toast) => toast.id !== id));

  private clearAll = () => this.setToasts([]);

  private onAddFromWindow = (event: Event) => {
    const { detail } = event as CustomEvent<PocToastInput>;
    if (detail) {
      this.addToast(detail);
    }
  };

  public start(core: CoreStart) {
    this.core = core;
    this.toastHost = document.createElement('div');
    this.toastHost.setAttribute('data-test-subj', 'pocStackedToastHost');
    document.body.appendChild(this.toastHost);
    this.reactRoot = createRoot(this.toastHost);
    this.render();

    window.addEventListener(POC_STACKED_TOAST_ADD_EVENT, this.onAddFromWindow);

    return {};
  }

  public stop() {
    window.removeEventListener(POC_STACKED_TOAST_ADD_EVENT, this.onAddFromWindow);
    this.reactRoot?.unmount();
    this.toastHost?.remove();
    this.reactRoot = undefined;
    this.toastHost = undefined;
    this.core = undefined;
  }
}
