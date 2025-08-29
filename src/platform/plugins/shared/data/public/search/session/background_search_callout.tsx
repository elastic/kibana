/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiProgress, EuiText, EuiPanel } from '@elastic/eui';
import React from 'react';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { SearchSessionState } from '../..';

export function BackgroundSearchCallout({
  bgsState,
}: {
  bgsState: Observable<SearchSessionState>;
}) {
  const bgSearch = useObservable(bgsState);
  return (
    <EuiPanel
      hasShadow={false}
      borderRadius="none"
      color="transparent"
      style={{ position: 'relative' }}
      paddingSize="s"
    >
      <EuiCallOut size="s">
        {bgSearch !== SearchSessionState.Restored ? (
          <EuiProgress size="xs" position="absolute" color="subdued" />
        ) : undefined}
        <EuiText size="xs">
          {' '}
          You are viewing cached data from a specific time range from a background search. Changing
          the time range or query will re-run the session.
        </EuiText>
      </EuiCallOut>
    </EuiPanel>
  );
}
