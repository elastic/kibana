/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { PanelNavNode } from './types';

const getTestSubj = (selectedNode: PanelNavNode | null): string | undefined => {
  if (!selectedNode) return;

  const deeplinkId = selectedNode.deepLink?.id;
  return classNames(`sideNavPanel`, {
    [`sideNavPanel-id-${selectedNode.id}`]: selectedNode.id,
    [`sideNavPanel-deepLinkId-${deeplinkId}`]: !!deeplinkId,
  });
};

const getTargetTestSubj = (target: EventTarget | null): string | undefined => {
  if (!target) return;

  return (target as HTMLElement).dataset.testSubj;
};

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
      let doClose = true;

      if (target) {
        // Only close if we are not clicking on the currently selected nav node
        const testSubj =
          getTargetTestSubj(target) ?? getTargetTestSubj((target as HTMLElement).parentNode);

        if (
          testSubj?.includes(`nav-item-${selectedNode?.path}`) ||
          testSubj?.includes(`panelOpener-${selectedNode?.path}`)
        ) {
          doClose = false;
        }
      }

      if (doClose) {
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
              data-test-subj={getTestSubj(selectedNode)}
            >
              {getContent()}
            </EuiPanel>
          </EuiOutsideClickDetector>
        </EuiFocusTrap>
      </div>
    </>
  );
};
