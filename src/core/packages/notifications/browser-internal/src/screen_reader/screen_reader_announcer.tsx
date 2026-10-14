/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FunctionComponent, type Ref } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { EuiLiveAnnouncer } from '@elastic/eui';
import type { Announcement } from './announcement_queue';

interface Props {
  announcement$: Observable<Announcement | undefined>;
  announcerRef: Ref<HTMLDivElement>;
}

/**
 * The single live region all screen reader announcements in Kibana go through.
 *
 * EuiLiveAnnouncer keeps one region that is always live and only changes its content, which screen
 * readers announce reliably. EuiScreenReaderLive instead un-hides and enables a second region in the
 * same update that inserts the content, which VoiceOver in particular does not reliably announce.
 */
export const ScreenReaderAnnouncer: FunctionComponent<Props> = ({
  announcement$,
  announcerRef,
}) => {
  const announcement = useObservable(announcement$);

  // Memoized so that re-renders don't restart EuiLiveAnnouncer's clear timer. Keys are unique per
  // announcement, so repeating a message inserts new nodes that screen readers announce again.
  const content = useMemo(
    () =>
      announcement ? (
        <>
          {announcement.messages.map((message, index) => (
            <p key={`${announcement.id}:${index}`}>{message}</p>
          ))}
        </>
      ) : null,
    [announcement]
  );

  return (
    <div ref={announcerRef}>
      <EuiLiveAnnouncer data-test-subj="screenReaderAnnouncer">{content}</EuiLiveAnnouncer>
    </div>
  );
};
