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
import { type Observable, distinctUntilChanged, of, scan } from 'rxjs';
import { css } from '@emotion/react';
import { EuiCallOut, EuiText, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SearchSessionState } from '@kbn/data-plugin/public';
import { getBackgroundSearchState$, isBackgroundSearchEnabled } from '../services';

const STICKY_STATES = new Set<SearchSessionState>([
  SearchSessionState.Restored,
  SearchSessionState.BackgroundLoading,
]);

export function BackgroundSearchRestoredCallout() {
  const state$ = getBackgroundSearchState$();

  const show$ = state$
    ? (state$ as Observable<SearchSessionState>).pipe(
        scan<SearchSessionState, boolean>((visible, s) => {
          if (!visible) return s === SearchSessionState.Restored;
          return STICKY_STATES.has(s);
        }, false),
        distinctUntilChanged()
      )
    : of(false);

  const showCallout = useObservable(show$, false);

  if (!isBackgroundSearchEnabled() || !showCallout) return null;

  return (
    <EuiPanel
      borderRadius="none"
      color="transparent"
      css={css`
        position: 'relative';
      `}
      data-test-subj="backgroundSearchRestoredCallout"
      hasShadow={false}
      paddingSize="s"
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
