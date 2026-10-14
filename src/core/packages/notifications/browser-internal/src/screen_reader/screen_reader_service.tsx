/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createRef } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { BehaviorSubject } from 'rxjs';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { ScreenReaderStart } from '@kbn/core-notifications-browser';
import type { Announcement, AnnouncementMessage } from './announcement_queue';
import { AnnouncementQueue } from './announcement_queue';
import { isHiddenFromAssistiveTech } from './is_hidden_from_assistive_tech';
import { ScreenReaderAnnouncer } from './screen_reader_announcer';

interface StartDeps {
  rendering: RenderingService;
  targetDomElement: HTMLElement;
}

/**
 * Internal contract, which also accepts messages resolved when they're announced.
 * @internal
 */
export interface InternalScreenReaderStart extends ScreenReaderStart {
  notify(message: AnnouncementMessage): void;
}

/**
 * Owns the single live region that toasts, page changes and plugins announce through, so that
 * announcements are queued instead of interrupting each other.
 */
export class ScreenReaderService {
  private queue?: AnnouncementQueue;
  private targetDomElement?: HTMLElement;

  public start({ rendering, targetDomElement }: StartDeps): InternalScreenReaderStart {
    const announcement$ = new BehaviorSubject<Announcement | undefined>(undefined);
    const announcerRef = createRef<HTMLDivElement>();
    const queue = new AnnouncementQueue({
      isHidden: () => isHiddenFromAssistiveTech(announcerRef.current),
      onAnnounce: (announcement) => announcement$.next(announcement),
    });

    this.queue = queue;
    this.targetDomElement = targetDomElement;

    render(
      rendering.addContext(
        <ScreenReaderAnnouncer announcement$={announcement$} announcerRef={announcerRef} />
      ),
      targetDomElement
    );

    return {
      notify: (message) => queue.add(message),
    };
  }

  public stop() {
    this.queue?.stop();

    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
      this.targetDomElement.textContent = '';
    }
  }
}
