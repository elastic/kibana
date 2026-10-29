/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { ScreenReaderNotifyOptions, ScreenReaderStart } from '@kbn/core-notifications-browser';
import type { Announcement, AnnouncementMessage, QueuedMessage } from './announcement_queue';
import { toAnnouncements } from './announcement_queue';
import { ScreenReaderAnnouncer } from './screen_reader_announcer';

interface StartDeps {
  rendering: RenderingService;
  targetDomElement: HTMLElement;
}

/**
 * Internal contract, which also accepts messages that are resolved when their batch closes.
 * @internal
 */
export interface InternalScreenReaderStart extends ScreenReaderStart {
  notify(message: AnnouncementMessage, options?: ScreenReaderNotifyOptions): void;
}

/**
 * Owns the live regions that toasts, page changes and plugins announce through, so that
 * announcements share one queue instead of interrupting each other.
 */
export class ScreenReaderService {
  private subscription?: Subscription;
  private targetDomElement?: HTMLElement;

  public start({ rendering, targetDomElement }: StartDeps): InternalScreenReaderStart {
    const messages$ = new Subject<QueuedMessage>();
    const announcement$ = new BehaviorSubject<Announcement | undefined>(undefined);

    this.subscription = toAnnouncements(messages$).subscribe(announcement$);
    this.targetDomElement = targetDomElement;

    render(
      rendering.addContext(<ScreenReaderAnnouncer announcement$={announcement$} />),
      targetDomElement
    );

    return {
      notify: (message, { politeness = 'polite', key } = {}) =>
        messages$.next({ message, politeness, key }),
    };
  }

  public stop() {
    this.subscription?.unsubscribe();

    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
      this.targetDomElement.textContent = '';
    }
  }
}
