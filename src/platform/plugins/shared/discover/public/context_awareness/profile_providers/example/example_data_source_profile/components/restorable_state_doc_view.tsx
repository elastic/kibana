/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { createRestorableStateProvider } from '@kbn/restorable-state';

const RestorableStateDocViewBase: React.FC<{
  clickCount: number;
  onIncrement: () => void;
}> = ({ clickCount, onIncrement }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      css={{ padding: euiTheme.size.m }}
    >
      <EuiFlexItem grow={false}>
        <EuiCallOut title="DocView restorable state" color="primary" iconType="info">
          By wrapping your custom <code>DocView</code> with <code>withRestorableState</code> and
          using <code>useRestorableState</code>, you can easily add restorable state to your
          component. State is coupled to the specific tab and will be restored when navigating away
          and back to the tab as long as you don&apos;t close the flyout or change the displayed
          document.
        </EuiCallOut>
      </EuiFlexItem>
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem grow={false}>
          <div data-test-subj="example-restorable-state-doc-view-count">Count: {clickCount}</div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            size="s"
            onClick={onIncrement}
            data-test-subj="example-restorable-state-doc-view-increment-button"
          >
            Increment
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

interface RestorableStateDocViewState {
  clickCount: number;
}

const { withRestorableState, useRestorableState } =
  createRestorableStateProvider<RestorableStateDocViewState>();

export const RestorableStateDocView = withRestorableState(() => {
  const [clickCount, setClickCount] = useRestorableState('clickCount', 0);

  return (
    <RestorableStateDocViewBase
      clickCount={clickCount}
      onIncrement={() => setClickCount(clickCount + 1)}
    />
  );
});
