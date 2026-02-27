/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, firstValueFrom } from 'rxjs';
import { unmountComponentAtNode } from 'react-dom';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

/** Callback invoked when a flyout is closed with its container (hidden but still in DOM). Used for pruning. */
export type OnFlyoutContainerHidden = (hiddenContainer: HTMLElement) => void;

/**
 * A SystemFlyoutRef is a reference to an opened system flyout panel.
 * It provides methods to close the flyout and integrates with the EUI Flyout Manager.
 *
 * When closed, the container is hidden (display:none, aria-hidden) and kept in the document
 * instead of being removed. This avoids Emotion's StyleSheet holding stale DOM refs that can
 * cause insertBefore to throw when another flyout is opened later.
 */
export class SystemFlyoutRef implements OverlayRef {
  public readonly onClose: Promise<void>;
  private _isClosed = false;
  private closeSubject = new Subject<void>();
  private container: HTMLElement;
  private onContainerHidden?: OnFlyoutContainerHidden;

  constructor(container: HTMLElement, onContainerHidden?: OnFlyoutContainerHidden) {
    this.container = container;
    this.onContainerHidden = onContainerHidden;
    this.onClose = firstValueFrom(this.closeSubject);
  }

  public get isClosed(): boolean {
    return this._isClosed;
  }

  public close(): Promise<void> {
    if (!this._isClosed) {
      this._isClosed = true;
      unmountComponentAtNode(this.container);
      // Keep container in the document but hidden so Emotion's StyleSheet doesn't
      // hold refs to removed nodes (which causes insertBefore to throw on next insert).
      this.container.style.display = 'none';
      this.container.setAttribute('aria-hidden', 'true');
      this.container.setAttribute('data-system-flyout-hidden', 'true');
      this.onContainerHidden?.(this.container);
      this.closeSubject.next();
      this.closeSubject.complete();
    }
    return this.onClose;
  }
}
