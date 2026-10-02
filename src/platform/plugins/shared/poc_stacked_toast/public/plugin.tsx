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
import { toMountPoint } from '@kbn/react-kibana-mount';
import { createRoot, type Root } from 'react-dom/client';
import { POC_STACKED_TOAST_ADD_EVENT } from './poc_toast/poc_toast_events';
import { createRandomPocToastInput } from './poc_toast/poc_toast_random';
import { PocToastStack } from './poc_toast/poc_toast_stack';
import { PocToastStackTrigger } from './poc_toast/poc_toast_stack_trigger';
import type { PocToast, PocToastInput } from './poc_toast/poc_toast_types';

let nextToastId = 0;

export class PocStackedToastPlugin implements Plugin {
  private core: CoreStart | undefined;
  private reactRoot: Root | undefined;
  private toastHost: HTMLDivElement | undefined;
  private unregisterChromeTrigger: (() => void) | undefined;
  private toasts: PocToast[] = [];

  public setup() {
    return {};
  }

  private setToasts = (toasts: PocToast[]) => {
    this.toasts = toasts;
    if (!this.reactRoot || !this.core) {
      return;
    }
    this.reactRoot.render(
      this.core.rendering.addContext(
        <PocToastStack toasts={toasts} onDismiss={this.dismissToast} onClearAll={this.clearAll} />
      )
    );
  };

  private addToast = (input: PocToastInput) =>
    this.setToasts([...this.toasts, { id: String(nextToastId++), ...input }]);

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
    this.setToasts(this.toasts);

    window.addEventListener(POC_STACKED_TOAST_ADD_EVENT, this.onAddFromWindow);

    this.unregisterChromeTrigger = core.chrome.controls.aiButton.register({
      content: toMountPoint(
        <PocToastStackTrigger onAdd={() => this.addToast(createRandomPocToastInput())} />,
        core.rendering
      ),
    });

    return {};
  }

  public stop() {
    window.removeEventListener(POC_STACKED_TOAST_ADD_EVENT, this.onAddFromWindow);
    this.unregisterChromeTrigger?.();
    this.reactRoot?.unmount();
    this.toastHost?.remove();
    this.reactRoot = undefined;
    this.toastHost = undefined;
    this.core = undefined;
  }
}
