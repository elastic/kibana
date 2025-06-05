/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
} from '@elastic/eui';
import type {
  FlyoutPropsEnhanced,
  ManagedFlyoutEntry,
  ManagedFlyoutApi,
} from '@kbn/core-overlays-browser';

import { managedFlyoutService } from './managed_flyout_service';
import { useManagedFlyout } from './use_managed_flyout';

interface FlyoutPanelProps {
  entry: ManagedFlyoutEntry | null;
  level: 'main' | 'child';
  positionRight: number;
  managedFlyoutApi: ManagedFlyoutApi;
}

const FlyoutPanel = React.memo(
  ({ entry, level, positionRight, managedFlyoutApi }: FlyoutPanelProps) => {
    const [isOpen, setIsOpen] = useState(!!entry);

    useEffect(() => {
      setIsOpen(!!entry);
    }, [entry]);

    const handleCloseFlyout = useCallback(() => managedFlyoutApi.closeFlyout(), [managedFlyoutApi]);
    const handleCloseChildFlyout = useCallback(
      () => managedFlyoutApi.closeChildFlyout(),
      [managedFlyoutApi]
    );

    const bodyToRender = useMemo<React.ReactNode>(
      () => (entry && entry.renderBody ? entry.renderBody(managedFlyoutApi) : null),
      [entry, managedFlyoutApi]
    );
    const headerToRender = useMemo<React.ReactNode>(
      () => (entry && entry.renderHeader ? entry.renderHeader(managedFlyoutApi) : null),
      [entry, managedFlyoutApi]
    );
    const flyoutProps = useMemo<FlyoutPropsEnhanced>(
      () => (entry && entry.flyoutProps ? entry.flyoutProps(managedFlyoutApi) : { size: 400 }),
      [entry, managedFlyoutApi]
    );
    const footerActions = useMemo<Record<string, React.ReactElement>>(
      () => (entry && entry.footerActions ? entry.footerActions(managedFlyoutApi) : {}),
      [entry, managedFlyoutApi]
    );

    if (!isOpen) {
      return;
    }

    return (
      <EuiFlyout
        {...flyoutProps}
        onClose={handleCloseFlyout}
        hideCloseButton
        css={({ euiTheme }) => ({
          right: positionRight,
          backgroundColor: level === 'child' ? euiTheme.colors.backgroundBaseSubdued : undefined,
        })}
        size={level === 'child' ? 's' : flyoutProps.size}
        type={level === 'child' ? 'overlay' : flyoutProps.type}
        ownFocus={
          level === 'child'
            ? false
            : typeof flyoutProps.ownFocus === 'undefined' && flyoutProps.type === 'push'
            ? true
            : flyoutProps.ownFocus
        }
      >
        {headerToRender && (
          <EuiFlyoutHeader hasBorder>
            {headerToRender}
            <EuiSpacer size="s" />
          </EuiFlyoutHeader>
        )}
        <EuiFlyoutBody>{bodyToRender}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={level === 'main' ? handleCloseFlyout : handleCloseChildFlyout}
                flush="left"
              >
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            {footerActions && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                  {Object.entries(footerActions).map(([key, action]) => (
                    <EuiFlexItem key={key}>{action}</EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

export const FlyoutContainer: React.FC = () => {
  const managedFlyoutApi = useManagedFlyout();
  const flyout$ = managedFlyoutService.getFlyout$();
  const flyoutState = useObservable(flyout$, { main: null, child: null });

  const mainFlyoutWidth = useMemo(
    () => flyoutState.main?.flyoutProps?.(managedFlyoutApi).size || 400,
    [flyoutState.main, managedFlyoutApi]
  );

  return (
    <>
      <FlyoutPanel
        entry={flyoutState.main}
        level="main"
        positionRight={0}
        managedFlyoutApi={managedFlyoutApi}
      />

      {flyoutState.main && (
        <FlyoutPanel
          entry={flyoutState.child}
          level="child"
          positionRight={mainFlyoutWidth}
          managedFlyoutApi={managedFlyoutApi}
        />
      )}
    </>
  );
};
