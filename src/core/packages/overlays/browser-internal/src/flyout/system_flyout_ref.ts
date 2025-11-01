/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import { unmountComponentAtNode } from 'react-dom';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

/**
 * A SystemFlyoutRef is a reference to an opened system flyout panel.
 * It provides methods to close the flyout and integrates with the EUI Flyout Manager.
 */
export class SystemFlyoutRef implements OverlayRef {
  public readonly onClose: Promise<void>;
  private closeSubject = new Subject<void>();
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.onClose = this.closeSubject.toPromise();
  }

  public close(): Promise<void> {
    if (!this.closeSubject.closed) {
      unmountComponentAtNode(this.container);
      this.container.remove();

      this.closeSubject.next();
      this.closeSubject.complete();
    }
    return this.onClose;
  }
}
