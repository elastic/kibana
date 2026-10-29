/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { EuiLiveAnnouncer } from '@elastic/eui';
import type { Announcement, Politeness } from './announcement_queue';

/**
 * How long an announcement stays in its live region. Screen readers read a changed region when they
 * get to it, which can be seconds later, e.g. when VoiceOver first describes the new page after a
 * navigation removed the focused element. Clearing it afterwards keeps users from finding stale
 * messages when they browse to the end of the page.
 */
export const ANNOUNCEMENT_CLEAR_MS = 15_000;

/**
 * An announcement goes to a single live region: the assertive one if any of its messages is
 * assertive. Updating both regions at once could drop the polite part, because an assertive update
 * may clear speech that screen readers have queued.
 */
const getPoliteness = ({ messages }: Announcement): Politeness =>
  messages.some(({ politeness }) => politeness === 'assertive') ? 'assertive' : 'polite';

const LiveRegion: FunctionComponent<{
  politeness: Politeness;
  announcement: Announcement | undefined;
}> = ({ politeness, announcement }) => {
  const messages =
    announcement && getPoliteness(announcement) === politeness ? announcement.messages : [];

  return (
    <EuiLiveAnnouncer
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      clearAfterMs={ANNOUNCEMENT_CLEAR_MS}
      data-test-subj={politeness === 'assertive' ? 'screenReaderAlerts' : 'screenReaderStatus'}
    >
      {announcement && messages.length ? (
        <>
          {/* Keys are unique per announcement, so repeating a message inserts new nodes that
              screen readers announce again */}
          {messages.map(({ text }, index) => (
            <p key={`${announcement.id}:${index}`}>{text}</p>
          ))}
        </>
      ) : null}
    </EuiLiveAnnouncer>
  );
};

/**
 * The live regions all screen reader announcements in Kibana go through: a polite one for status
 * messages and page changes, and an assertive one for toasts and urgent messages. A batch that mixes
 * both, e.g. a toast and the page title after save-and-navigate, is read in the assertive one.
 *
 * Toasts are assertive because actions that show a toast often also move focus, e.g. a closed
 * flyout returning focus to its trigger, and VoiceOver drops or talks over polite announcements made
 * while it reads the newly focused element.
 *
 * EuiLiveAnnouncer keeps a region that is always live and only changes its content, which screen
 * readers announce reliably. EuiScreenReaderLive instead un-hides and enables a second region in the
 * same update that inserts the content, which VoiceOver in particular does not reliably announce.
 */
export const ScreenReaderAnnouncer: FunctionComponent<{
  announcement$: Observable<Announcement | undefined>;
}> = ({ announcement$ }) => {
  const announcement = useObservable(announcement$);

  return (
    <>
      <LiveRegion politeness="polite" announcement={announcement} />
      <LiveRegion politeness="assertive" announcement={announcement} />
    </>
  );
};
