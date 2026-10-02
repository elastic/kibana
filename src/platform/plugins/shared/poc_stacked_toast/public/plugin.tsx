/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { createRoot, type Root } from 'react-dom/client';
import { pocToastBridge } from './poc_toast/poc_toast_bridge';
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
  private removeWindowListener: (() => void) | undefined;
  private toasts: PocToast[] = [];

  constructor(_initializerContext: unknown) {}

  public setup(_core: CoreSetup) {
    return {};
  }

  private renderToastUi = () => {
    if (!this.reactRoot || !this.core) {
      return;
    }

    this.reactRoot.render(
      this.core.rendering.addContext(
        <PocToastStack
          toasts={this.toasts}
          onDismiss={this.dismissToast}
          onClearAll={this.clearAll}
        />
      )
    );
  };

  private addToast = (input: PocToastInput) => {
    const toast: PocToast = {
      id: String(nextToastId++),
      ...input,
    };
    this.toasts = [...this.toasts, toast];
    this.renderToastUi();
  };

  /** Removes toast from state; {@link PocToastStack} runs exit via `AnimatePresence`. */
  private dismissToast = (id: string) => {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.renderToastUi();
  };

  private clearAll = () => {
    if (this.toasts.length === 0) {
      return;
    }
    this.toasts = [];
    this.renderToastUi();
  };

  public start(core: CoreStart) {
    this.core = core;

    const container = document.createElement('div');
    container.setAttribute('data-test-subj', 'pocStackedToastHost');
    document.body.appendChild(container);
    this.toastHost = container;

    this.reactRoot = createRoot(container);

    pocToastBridge.addToast = this.addToast;

    const onAddFromWindow = (event: Event) => {
      const { detail } = event as CustomEvent<PocToastInput>;
      if (detail) {
        this.addToast(detail);
      }
    };
    window.addEventListener(POC_STACKED_TOAST_ADD_EVENT, onAddFromWindow);
    this.removeWindowListener = () =>
      window.removeEventListener(POC_STACKED_TOAST_ADD_EVENT, onAddFromWindow);

    this.renderToastUi();

    const addRandomToast = () => this.addToast(createRandomPocToastInput());

    this.unregisterChromeTrigger = core.chrome.controls.aiButton.register({
      content: toMountPoint(
        <PocToastStackTrigger onAdd={addRandomToast} />,
        core.rendering
      ),
    });

    return {};
  }

  public stop() {
    pocToastBridge.addToast = () => {};
    this.unregisterChromeTrigger?.();
    this.removeWindowListener?.();
    this.reactRoot?.unmount();
    this.toastHost?.remove();
    this.reactRoot = undefined;
    this.toastHost = undefined;
    this.core = undefined;
  }
}
