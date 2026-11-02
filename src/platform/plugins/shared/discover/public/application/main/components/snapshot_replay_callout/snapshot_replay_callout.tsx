/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import {
  internalStateActions,
  selectTabRuntimeState,
  useCurrentTabRuntimeState,
  useCurrentTabSelector,
  useInternalStateDispatch,
  useRuntimeStateManager,
} from '../../state_management/redux';

/** Shown while the current tab replays an imported Inspector snapshot. */
export const SnapshotReplayCallout = () => {
  const replay = useCurrentTabRuntimeState((tab) => tab.replay$);
  const tabId = useCurrentTabSelector((tab) => tab.id);
  const runtimeStateManager = useRuntimeStateManager();
  const dispatch = useInternalStateDispatch();

  if (!replay) {
    return null;
  }

  const { createdAt, kibanaVersion, timezone } = replay.meta;
  const goLive = () => {
    replay.dispose();
    selectTabRuntimeState(runtimeStateManager, tabId)?.replay$.next(undefined);
    dispatch(internalStateActions.fetchData({ tabId }));
  };

  return (
    <EuiCallOut
      size="s"
      color="warning"
      iconType="upload"
      title={`Replaying Inspector snapshot from ${new Date(
        createdAt
      ).toLocaleString()}, Kibana ${kibanaVersion}`}
      data-test-subj="discoverSnapshotReplayCallout"
    >
      <p>
        Table and histogram show the recorded responses, not live data.
        {timezone ? ` Recorded with time zone ${timezone}.` : ''} Requests that are not in the
        snapshot fail.
      </p>
      <EuiButton size="s" onClick={goLive} data-test-subj="discoverSnapshotGoLive">
        Go live
      </EuiButton>
    </EuiCallOut>
  );
};
