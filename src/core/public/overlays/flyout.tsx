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
import ReactDOM from 'react-dom';
import { Observable, Subject } from 'rxjs';
import { I18nSetup } from '../i18n';
import { getOrCreateContainerElement } from './dom_utils';

const CONTAINER_ID = 'flyout-container';

/**
 * A FlyoutSession describes the session of one opened flyout panel. It offers
 * methods to close the flyout panel again. If you open a flyout panel you should make
 * sure you call {@link FlyoutSession#close} when it should be closed.
 * Since a flyout could also be closed without calling this method (e.g. because
 * the user closes it), you must listen to the "closed" event on this instance.
 * It will be emitted whenever the flyout will be closed and you should throw
 * away your reference to this instance whenever you receive that event.
 * @extends EventEmitter
 */
class FlyoutSession {
  /**
   * A promise that will be resolved once this flytout session is closed,
   * by the user or by closing it from the outside via valling {@link #close}.
   */
  public readonly onClose$: Observable<void>;

  private closeSubject = new Subject<void>();

  constructor(private readonly activeSessionGetter: () => FlyoutSession | null) {
    this.onClose$ = this.closeSubject.asObservable();
  }

  /**
   * Closes the opened flyout as long as it's still the open one.
   * If this is not the active session anymore, this method won't do anything.
   * If this session was still active and a flyout was closed, the {@link #onClose}
   * promise will be resolved when calling this.
   */
  public close(): void {
    if (this.activeSessionGetter() === this) {
      const container = document.getElementById(CONTAINER_ID);
      if (container) {
        ReactDOM.unmountComponentAtNode(container);
        this.closeSubject.next();
        this.closeSubject.complete();
      }
    }
  }
}

class FlyoutService {
  private activeSession: FlyoutSession | null = null;

  /**
   * Opens a flyout panel with the given component inside. You can use
   * {@link FlyoutSession#close} on the return value to close the flyout.
   *
   * @param flyoutChildren - Mounts the children inside a fly out panel
   * @return {FlyoutSession} The session instance for the opened flyout panel.
   */
  public openFlyout = (
    i18n: I18nSetup,
    flyoutChildren: React.ReactNode,
    flyoutProps: {
      closeButtonAriaLabel?: string;
      'data-test-subj'?: string;
    } = {}
  ): FlyoutSession => {
    // If there is an active inspector session close it before opening a new one.
    if (this.activeSession) {
      this.activeSession.close();
    }
    const container = getOrCreateContainerElement(CONTAINER_ID);
    const session = (this.activeSession = new FlyoutSession(() => this.activeSession));

    ReactDOM.render(
      <i18n.Context>
        <EuiFlyout {...flyoutProps} onClose={() => session.close()}>
          {flyoutChildren}
        </EuiFlyout>
      </i18n.Context>,
      container
    );

    return session;
  };
}

export { FlyoutService, FlyoutSession };
