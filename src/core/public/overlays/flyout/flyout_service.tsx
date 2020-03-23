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

/* eslint-disable max-classes-per-file */

import { EuiFlyout } from '@elastic/eui';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subject } from 'rxjs';
import { I18nStart } from '../../i18n';
import { MountPoint } from '../../types';
import { OverlayRef } from '../types';
import { MountWrapper } from '../../utils';

/**
 * A FlyoutRef is a reference to an opened flyout panel. It offers methods to
 * close the flyout panel again. If you open a flyout panel you should make
 * sure you call `close()` when it should be closed.
 * Since a flyout could also be closed by a user or from another flyout being
 * opened, you must bind to the `onClose` Promise on the FlyoutRef instance.
 * The Promise will resolve whenever the flyout was closed at which point you
 * should discard the FlyoutRef.
 *
 * @public
 */
class FlyoutRef implements OverlayRef {
  /**
   * An Promise that will resolve once this flyout is closed.
   *
   * Flyouts can close from user interaction, calling `close()` on the flyout
   * reference or another call to `openFlyout()` replacing your flyout.
   */
  public readonly onClose: Promise<void>;

  private closeSubject = new Subject<void>();

  constructor() {
    this.onClose = this.closeSubject.toPromise();
  }

  /**
   * Closes the referenced flyout if it's still open which in turn will
   * resolve the `onClose` Promise. If the flyout had already been
   * closed this method does nothing.
   */
  public close(): Promise<void> {
    if (!this.closeSubject.closed) {
      this.closeSubject.next();
      this.closeSubject.complete();
    }
    return this.onClose;
  }
}

/**
 * APIs to open and manage fly-out dialogs.
 *
 * @public
 */
export interface OverlayFlyoutStart {
  /**
   * Opens a flyout panel with the given mount point inside. You can use
   * `close()` on the returned FlyoutRef to close the flyout.
   *
   * @param mount {@link MountPoint} - Mounts the children inside a flyout panel
   * @param options {@link OverlayFlyoutOpenOptions} - options for the flyout
   * @return {@link OverlayRef} A reference to the opened flyout panel.
   */
  open(mount: MountPoint, options?: OverlayFlyoutOpenOptions): OverlayRef;
}

/**
 * @public
 */
export interface OverlayFlyoutOpenOptions {
  className?: string;
  closeButtonAriaLabel?: string;
  'data-test-subj'?: string;
}

interface StartDeps {
  i18n: I18nStart;
  targetDomElement: Element;
}

/** @internal */
export class FlyoutService {
  private activeFlyout: FlyoutRef | null = null;
  private targetDomElement: Element | null = null;

  public start({ i18n, targetDomElement }: StartDeps): OverlayFlyoutStart {
    this.targetDomElement = targetDomElement;

    return {
      open: (mount: MountPoint, options: OverlayFlyoutOpenOptions = {}): OverlayRef => {
        // If there is an active flyout session close it before opening a new one.
        if (this.activeFlyout) {
          this.activeFlyout.close();
          this.cleanupDom();
        }

        const flyout = new FlyoutRef();

        // If a flyout gets closed through it's FlyoutRef, remove it from the dom
        flyout.onClose.then(() => {
          if (this.activeFlyout === flyout) {
            this.cleanupDom();
          }
        });

        this.activeFlyout = flyout;

        render(
          <i18n.Context>
            <EuiFlyout {...options} onClose={() => flyout.close()}>
              <MountWrapper mount={mount} className="kbnOverlayMountWrapper" />
            </EuiFlyout>
          </i18n.Context>,
          this.targetDomElement
        );

        return flyout;
      },
    };
  }

  /**
   * Using React.Render to re-render into a target DOM element will replace
   * the content of the target but won't call unmountComponent on any
   * components inside the target or any of their children. So we properly
   * cleanup the DOM here to prevent subtle bugs in child components which
   * depend on unmounting for cleanup behaviour.
   */
  private cleanupDom(): void {
    if (this.targetDomElement != null) {
      unmountComponentAtNode(this.targetDomElement);
      this.targetDomElement.innerHTML = '';
    }
    this.activeFlyout = null;
  }
}
