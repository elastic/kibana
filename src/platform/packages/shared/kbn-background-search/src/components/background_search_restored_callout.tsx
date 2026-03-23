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
import { EuiCallOut, EuiText, EuiPanel, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SearchSessionState } from '@kbn/data-plugin/public';

const STICKY_SESSION_STATES = new Set<SearchSessionState>([
  SearchSessionState.Restored,
  SearchSessionState.BackgroundLoading,
]);

interface BackgroundSearchRestoredCalloutProps {
  /**
   * Indicates whether the current query is an ES|QL query. Used for styling purposes.
   */
  isESQLQuery?: boolean;
  /**
   * Observable that emits the current SearchSessionState to drive the callout visibility.
   */
  state$: Observable<SearchSessionState>;
}

/**
 * Displays a sticky callout when a search session was restored (cached background search).
 *
 * The callout becomes visible when the session transitions to Restored and remains visible
 * for the Restored / BackgroundLoading states until a non-background state appears.
 *
 * @param props Component props.
 */
export function BackgroundSearchRestoredCallout(props: BackgroundSearchRestoredCalloutProps) {
  const { isESQLQuery = false, state$ } = props;
  const { euiTheme } = useEuiTheme();

  const show$ = state$
    ? (state$ as Observable<SearchSessionState>).pipe(
        scan<SearchSessionState, boolean>((visible, s) => {
          if (!visible) return s === SearchSessionState.Restored;
          return STICKY_SESSION_STATES.has(s);
        }, false),
        distinctUntilChanged()
      )
    : of(false);

  const showCallout = useObservable(show$, false);

  if (!showCallout) return null;

  return (
    <EuiPanel
      borderRadius="none"
      color="transparent"
      css={css`
        padding-bottom: ${isESQLQuery ? 0 : euiTheme.size.s};
      `}
      data-test-subj="backgroundSearchRestoredCallout"
      hasShadow={false}
      paddingSize={isESQLQuery ? 's' : 'none'}
    >
      <EuiCallOut size="s">
        <EuiText size="xs">
          <FormattedMessage
            id="backgroundSearch.backgroundSearchRestoredCallout.message"
            defaultMessage="You are viewing cached data from a specific time range from a background search. Changing the time range or query will re-run the session."
          />
        </EuiText>
      </EuiCallOut>
    </EuiPanel>
  );
}
