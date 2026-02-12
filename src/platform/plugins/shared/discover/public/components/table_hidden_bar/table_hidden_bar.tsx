/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { HitsCounter, HitsCounterMode } from '../hits_counter';
import type { DiscoverStateContainer } from '../../application/main/state_management/discover_state';
import type { PanelsToggleProps } from '../panels_toggle';

export interface TableHiddenBarProps {
  stateContainer: DiscoverStateContainer;
  /** Panels toggle (includes show/hide table) - when provided, renders grouped with hits counter */
  panelsToggle?: ReactElement<PanelsToggleProps>;
}

export const TableHiddenBar: React.FC<TableHiddenBarProps> = ({
  stateContainer,
  panelsToggle,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.s};
      `}
      data-test-subj="dscTableHiddenBar"
    >
      {panelsToggle && <EuiFlexItem grow={false}>{panelsToggle}</EuiFlexItem>}
      <EuiFlexItem grow={false}>
        <HitsCounter
          mode={HitsCounterMode.standalone}
          stateContainer={stateContainer}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
