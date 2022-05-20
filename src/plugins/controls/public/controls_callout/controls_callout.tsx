/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import './controls_callout.scss';
import { ControlGroupStrings } from '../control_group/control_group_strings';
import { ControlsIllustration } from './controls_illustration';

const CONTROLS_CALLOUT_STATE_KEY = 'dashboard:controlsCalloutDismissed';

export interface CalloutProps {
  getCreateControlButton?: () => JSX.Element;
}

export const ControlsCallout = ({ getCreateControlButton }: CalloutProps) => {
  const [controlsCalloutDismissed, setControlsCalloutDismissed] = useLocalStorage(
    CONTROLS_CALLOUT_STATE_KEY,
    false
  );
  const dismissControls = () => {
    setControlsCalloutDismissed(true);
  };

  if (controlsCalloutDismissed) return null;

  return (
    <EuiPanel borderRadius="m" color="plain" paddingSize={'s'} className="controlsWrapper--empty">
      <EuiFlexGroup alignItems="center" gutterSize="xs" data-test-subj="controls-empty">
        <EuiFlexItem grow={1} className="controlsIllustration__container">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <ControlsIllustration />
            </EuiFlexItem>
            <EuiFlexItem className="emptyStateBadge" grow={false}>
              <EuiBadge color="accent">{ControlGroupStrings.emptyState.getBadge()}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText className="emptyStateText" size="s">
                <p>{ControlGroupStrings.emptyState.getCallToAction()}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="spaceAround" responsive={false} gutterSize="xs">
                {getCreateControlButton && <EuiFlexItem>{getCreateControlButton()}</EuiFlexItem>}
                <EuiFlexItem>
                  <EuiButtonEmpty size="s" onClick={dismissControls}>
                    {ControlGroupStrings.emptyState.getDismissButton()}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ControlsCallout;
