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

const DEBUG_PREFIX = '[SystemFlyoutRef]';

/**
 * A SystemFlyoutRef is a reference to an opened system flyout panel.
 * It provides methods to close the flyout and integrates with the EUI Flyout Manager.
 */
export class SystemFlyoutRef implements OverlayRef {
  public readonly onClose: Promise<void>;
  private _isClosed = false;
  private closeSubject = new Subject<void>();
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.onClose = firstValueFrom(this.closeSubject);
    console.debug(
      `${DEBUG_PREFIX} constructor called`,
      { containerTagName: container.tagName, dataAttribute: container.getAttribute?.('data-system-flyout') }
    );
  }

  public get isClosed(): boolean {
    console.debug(`${DEBUG_PREFIX} isClosed getter`, { _isClosed: this._isClosed });
    return this._isClosed;
  }

  public close(): Promise<void> {
    console.debug(`${DEBUG_PREFIX} close() called`, {
      _isClosedBefore: this._isClosed,
      willUnmount: !this._isClosed,
    });
    if (!this._isClosed) {
      this._isClosed = true;
      console.debug(`${DEBUG_PREFIX} close() unmounting and removing container`, {
        containerTagName: this.container.tagName,
      });
      unmountComponentAtNode(this.container);
      this.container.remove();

      console.debug(`${DEBUG_PREFIX} close() emitting and completing closeSubject`);
      this.closeSubject.next();
      this.closeSubject.complete();
    } else {
      console.debug(`${DEBUG_PREFIX} close() no-op (already closed)`);
    }
    console.debug(`${DEBUG_PREFIX} close() returning onClose promise`);
    return this.onClose;
  }
}
