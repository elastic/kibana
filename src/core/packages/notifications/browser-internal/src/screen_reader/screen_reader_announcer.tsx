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
import type { Announcement } from './announcement_queue';

interface Props {
  announcement$: Observable<Announcement | undefined>;
}

/**
 * The single live region all screen reader announcements in Kibana go through.
 *
 * It's assertive. Actions that show a toast often also move focus, e.g. a closed flyout returning
 * focus to its trigger, and VoiceOver drops or talks over polite announcements made while it reads
 * the newly focused element. An assertive announcement interrupts that readout instead.
 *
 * EuiLiveAnnouncer keeps one region that is always live and only changes its content, which screen
 * readers announce reliably. EuiScreenReaderLive instead un-hides and enables a second region in the
 * same update that inserts the content, which VoiceOver in particular does not reliably announce.
 *
 * The latest announcement stays until the next one replaces it. Screen readers read the region when
 * they get to it, which can be seconds later, e.g. when VoiceOver first describes the new page after
 * the focused element was removed by a navigation. Clearing it earlier would leave nothing to read.
 */
export const ScreenReaderAnnouncer: FunctionComponent<Props> = ({ announcement$ }) => {
  const announcement = useObservable(announcement$);

  return (
    <EuiLiveAnnouncer
      role="alert"
      aria-live="assertive"
      clearAfterMs={false}
      data-test-subj="screenReaderAnnouncer"
    >
      {announcement ? (
        <>
          {/* Keys are unique per announcement, so repeating a message inserts new nodes that
              screen readers announce again */}
          {announcement.messages.map((message, index) => (
            <p key={`${announcement.id}:${index}`}>{message}</p>
          ))}
        </>
      ) : null}
    </EuiLiveAnnouncer>
  );
};
