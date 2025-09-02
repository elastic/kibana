/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { type Observable, map, distinctUntilChanged, of } from 'rxjs';
import { EuiCallOut, EuiText, EuiPanel } from '@elastic/eui';
import { SearchSessionState } from '@kbn/data-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  getBackgroundSearchState$,
  isBackgroundSearchEnabled,
} from '../services/background_search_service';

export function BackgroundSearchRestoredCallout() {
  const state$ = getBackgroundSearchState$();

  const show$ = state$
    ? (state$ as Observable<SearchSessionState>).pipe(
        map((s) => s === SearchSessionState.Restored || s === SearchSessionState.BackgroundLoading),
        distinctUntilChanged()
      )
    : of(false);

  const showCallout = useObservable<boolean>(show$, false);

  if (!isBackgroundSearchEnabled() || !showCallout) return null;

  return (
    <EuiPanel
      borderRadius="none"
      color="transparent"
      hasShadow={false}
      paddingSize="s"
      style={{ position: 'relative' }}
    >
      <EuiCallOut size="s">
        <EuiText size="xs">
          <FormattedMessage
            id="backgroundSearch.backgroundSearchRestoredCallout.message"
            defaultMessage={
              'You are viewing cached data from a specific time range from a background search. Changing the time range or query will re-run the session.'
            }
          />
        </EuiText>
      </EuiCallOut>
    </EuiPanel>
  );
}
