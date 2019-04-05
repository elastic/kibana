/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* tslint:disable max-classes-per-file */

import { EuiFlyout } from '@elastic/eui';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable, Subject } from 'rxjs';
import { I18nSetup } from '../i18n';

/**
 * A FlyoutSession describes the session of one opened flyout panel. It offers
 * methods to close the flyout panel again. If you open a flyout panel you should make
 * sure you call `close()` when it should be closed.
 * Since a flyout could also be closed without calling this method (e.g. because
 * the user closes it), you must listen to the "closed" event on this instance.
 * It will be emitted whenever the flyout will be closed and you should throw
 * away your reference to this instance whenever you receive that event.
 *
 * @public
 */
export class FlyoutRef {
  /**
   * An Observable that will emit and complete once this flyout is closed,
   * by the user or by closing it from the outside via valling `close()`.
   */
  public readonly onClose$: Observable<void>;

  private closeSubject = new Subject<void>();

  constructor() {
    this.onClose$ = this.closeSubject.asObservable();
  }

  /**
   * Closes the referenced flyout if it's still open by emiting and completing
   * the `onClose()` Observable.
   * If the flyout had already been closed this method does nothing.
   */
  public close(): void {
    if (!this.closeSubject.closed) {
      this.closeSubject.next();
      this.closeSubject.complete();
    }
  }
}

/** @internal */
export class FlyoutService {
  private activeFlyout: FlyoutRef | null = null;

  /**
   * Opens a flyout panel with the given component inside. You can use
   * `close()` on the returned FlyoutRef to close the flyout.
   *
   * @param flyoutChildren - Mounts the children inside a flyout panel
   * @return {FlyoutRef} A reference to the opened flyout panel.
   */
  public openFlyout = (
    i18n: I18nSetup,
    targetDomElement: Element,
    flyoutChildren: React.ReactNode,
    flyoutProps: {
      closeButtonAriaLabel?: string;
      'data-test-subj'?: string;
    } = {}
  ): FlyoutRef => {
    // If there is an active flyout session close it before opening a new one.
    if (this.activeFlyout) {
      this.activeFlyout.close();
    }

    const flyout = (this.activeFlyout = new FlyoutRef());

    flyout.onClose$.subscribe({
      complete: () => {
        unmountComponentAtNode(targetDomElement);
        targetDomElement.innerHTML = '';
        this.activeFlyout = null;
      },
    });

    render(
      <EuiFlyout {...flyoutProps} onClose={() => flyout.close()}>
        {flyoutChildren}
      </EuiFlyout>,
      targetDomElement
    );

    return flyout;
  };
}
