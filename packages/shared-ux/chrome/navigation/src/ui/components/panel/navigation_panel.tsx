/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFocusTrap,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiWindowEvent,
  keys,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, type FC } from 'react';
import classNames from 'classnames';

import { usePanel } from './context';
import { getNavPanelStyles, getPanelWrapperStyles } from './styles';

export const NavigationPanel: FC = () => {
  const { euiTheme } = useEuiTheme();
  const { isOpen, close, getContent, selectedNode } = usePanel();

  // ESC key closes PanelNav
  const onKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === keys.ESCAPE) {
        close();
      }
    },
    [close]
  );

  const onOutsideClick = useCallback(
    ({ target }: Event) => {
      // Only close if we are not clicking on the currently selected nav node
      if (
        !(target as HTMLButtonElement).dataset.testSubj?.includes(`panelOpener-${selectedNode?.id}`)
      ) {
        close();
      }
    },
    [close, selectedNode]
  );

  const panelWrapperClasses = getPanelWrapperStyles();
  const sideNavPanelStyles = getNavPanelStyles(euiTheme);
  const panelClasses = classNames('sideNavPanel', 'eui-yScroll', sideNavPanelStyles);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <div className={panelWrapperClasses}>
        <EuiFocusTrap autoFocus css={{ height: '100%' }}>
          <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
            <EuiPanel
              className={panelClasses}
              hasShadow
              borderRadius="none"
              paddingSize="m"
              data-test-subj="sideNavPanel"
            >
              {getContent()}
            </EuiPanel>
          </EuiOutsideClickDetector>
        </EuiFocusTrap>
      </div>
    </>
  );
};
