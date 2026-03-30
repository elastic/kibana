/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject } from 'rxjs';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { useAppStateSelector } from '../../application/main/state_management/redux';
import type { SidebarToggleState } from '../../application/types';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../application/main/state_management/redux';

export interface PanelsToggleProps {
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  omitChartButton?: boolean;
  dataTestSubjSuffix?: string;
}

const getSidebarButton = ({
  isHidden,
  toggleSidebar,
}: {
  isHidden: boolean;
  toggleSidebar: () => void;
}) => ({
  label: isHidden
    ? i18n.translate('discover.panelsToggle.showSidebarButton', {
        defaultMessage: 'Expand field list',
      })
    : i18n.translate('discover.panelsToggle.hideSidebarButton', {
        defaultMessage: 'Collapse field list',
      }),
  iconType: isHidden ? 'transitionLeftIn' : 'transitionLeftOut',
  'data-test-subj': isHidden ? 'dscShowSidebarButton' : 'dscHideSidebarButton',
  'aria-expanded': !isHidden,
  'aria-controls': 'discover-sidebar',
  onClick: toggleSidebar,
});

const getChartButton = ({
  isHidden,
  toggleChart,
}: {
  isHidden: boolean;
  toggleChart: () => void;
}) => ({
  label: isHidden
    ? i18n.translate('discover.panelsToggle.showChartButton', {
        defaultMessage: 'Expand visualization',
      })
    : i18n.translate('discover.panelsToggle.hideChartButton', {
        defaultMessage: 'Collapse visualization',
      }),
  iconType: isHidden ? 'transitionTopIn' : 'transitionTopOut',
  'data-test-subj': isHidden ? 'dscShowHistogramButton' : 'dscHideHistogramButton',
  'aria-expanded': !isHidden,
  'aria-controls': 'unifiedHistogramCollapsablePanel',
  onClick: toggleChart,
});

/**
 * @param sidebarToggleState$
 * @param omitChartButton
 * @param dataTestSubjSuffix
 * @constructor
 */
export const PanelsToggle: React.FC<PanelsToggleProps> = ({
  sidebarToggleState$,
  omitChartButton = false,
  dataTestSubjSuffix,
}) => {
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));
  const sidebarToggleState = useObservable(sidebarToggleState$, sidebarToggleState$.getValue());
  const isSidebarHidden = sidebarToggleState.isCollapsed;
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const onToggleChart = useCallback(() => {
    dispatch(updateAppState({ appState: { hideChart: !isChartHidden } }));
  }, [dispatch, isChartHidden, updateAppState]);

  const onToggleSidebar = useCallback(() => {
    sidebarToggleState.toggle?.(!isSidebarHidden);
  }, [isSidebarHidden, sidebarToggleState]);

  const buttons = [];

  if (!isMobile) {
    buttons.push(
      getSidebarButton({
        isHidden: isSidebarHidden,
        toggleSidebar: onToggleSidebar,
      })
    );
  }

  if (!omitChartButton) {
    buttons.push(
      getChartButton({
        isHidden: isChartHidden,
        toggleChart: onToggleChart,
      })
    );
  }

  if (!buttons.length) {
    return null;
  }

  return (
    <IconButtonGroup
      data-test-subj={`dscPanelsToggle${dataTestSubjSuffix ?? ''}`}
      legend={i18n.translate('discover.panelsToggle.panelsVisibilityLegend', {
        defaultMessage: 'Panels visibility',
      })}
      buttonSize="s"
      buttons={buttons}
    />
  );
};
