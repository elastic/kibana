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
import { useIsWithinBreakpoints, type IconType } from '@elastic/eui';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { useAppStateSelector } from '../../application/main/state_management/redux';
import type { SidebarToggleState } from '../../application/types';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../application/main/state_management/redux';

const disabledCollapsingTooltip = i18n.translate(
  'discover.panelsToggle.atLeastOnePanelMustRemain',
  {
    defaultMessage: 'You must keep at least one area visible',
  }
);

export interface PanelsToggleProps {
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  omitChartButton?: boolean;
  omitTableButton?: boolean;
  dataTestSubjSuffix?: string;
}

// Temporary, TODO: replace with appropriate icons when they are available in EUI (#257879)
const temporaryExpandTableIcon: IconType = (props) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M8.5 3.29297L8.5 7.08594L10.1465 5.43945L10.8535 6.14649L8 9L5.14649 6.14648L5.85352 5.43945L7.5 7.08594L7.5 3.29297L8.5 3.29297Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 15C1.44771 15 1 14.5523 1 14L1 2C1 1.44772 1.44772 1 2 1L14 1C14.5523 1 15 1.44772 15 2L15 14C15 14.5523 14.5523 15 14 15L2 15ZM14 2L2 2L2 10L14 10L14 2ZM14 11.793L14 11L13.207 11L10.207 14L11.793 14L14 11.793ZM11.793 11L10.207 11L7.20703 14L8.79297 14L11.793 11ZM8.79297 11L7.20703 11L4.20703 14L5.79297 14L8.79297 11ZM5.79297 11L4.20703 11L2 13.207L2 14L2.79297 14L5.79297 11ZM2.79297 11L2 11L2 11.793L2.79297 11ZM14 13.207L13.207 14L14 14L14 13.207Z"
      fill="currentColor"
    />
  </svg>
);

const temporaryCollapseTableIcon: IconType = (props) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M7.5 9L7.5 5.20703L5.85352 6.85352L5.14649 6.14648L8 3.29297L10.8535 6.14649L10.1465 6.85352L8.5 5.20703L8.5 9L7.5 9Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 15C1.44771 15 1 14.5523 1 14L1 2C1 1.44772 1.44772 1 2 1L14 1C14.5523 1 15 1.44772 15 2L15 14C15 14.5523 14.5523 15 14 15L2 15ZM14 2L2 2L2 10L14 10L14 2ZM14 11.793L14 11L13.207 11L10.207 14L11.793 14L14 11.793ZM11.793 11L10.207 11L7.20703 14L8.79297 14L11.793 11ZM8.79297 11L7.20703 11L4.20703 14L5.79297 14L8.79297 11ZM5.79297 11L4.20703 11L2 13.207L2 14L2.79297 14L5.79297 11ZM2.79297 11L2 11L2 11.793L2.79297 11ZM14 13.207L13.207 14L14 14L14 13.207Z"
      fill="currentColor"
    />
  </svg>
);

const getSidebarButton = ({
  isHidden,
  toggleSidebar,
}: {
  isHidden: boolean;
  toggleSidebar: () => void;
}) => {
  const label = isHidden
    ? i18n.translate('discover.panelsToggle.showSidebarButton', {
        defaultMessage: 'Show field list',
      })
    : i18n.translate('discover.panelsToggle.hideSidebarButton', {
        defaultMessage: 'Hide field list',
      });

  return {
    label,
    iconType: isHidden ? 'transitionLeftIn' : 'transitionLeftOut',
    'data-test-subj': isHidden ? 'dscShowSidebarButton' : 'dscHideSidebarButton',
    'aria-expanded': !isHidden,
    'aria-controls': 'discover-sidebar',
    toolTipContent: label,
    onClick: toggleSidebar,
  };
};

const getChartButton = ({
  isHidden,
  toggleChart,
  isDisabled,
}: {
  isHidden: boolean;
  toggleChart: () => void;
  isDisabled?: boolean;
}) => {
  const label = isHidden
    ? i18n.translate('discover.panelsToggle.showChartButton', {
        defaultMessage: 'Show visualization',
      })
    : i18n.translate('discover.panelsToggle.hideChartButton', {
        defaultMessage: 'Hide visualization',
      });

  return {
    label,
    iconType: isHidden ? 'transitionTopIn' : 'transitionTopOut',
    'data-test-subj': isHidden ? 'dscShowHistogramButton' : 'dscHideHistogramButton',
    'aria-expanded': !isHidden,
    'aria-controls': 'unifiedHistogramCollapsablePanel',
    isDisabled,
    toolTipContent: isDisabled ? disabledCollapsingTooltip : label,
    onClick: toggleChart,
  };
};

const getTableButton = ({
  isHidden,
  toggleTable,
  isDisabled,
}: {
  isHidden: boolean;
  toggleTable: () => void;
  isDisabled?: boolean;
}) => {
  const label = isHidden
    ? i18n.translate('discover.panelsToggle.showTableButton', {
        defaultMessage: 'Show results table',
      })
    : i18n.translate('discover.panelsToggle.hideTableButton', {
        defaultMessage: 'Hide results table',
      });

  return {
    label,
    iconType: isHidden ? temporaryCollapseTableIcon : temporaryExpandTableIcon,
    'data-test-subj': isHidden ? 'dscShowTableButton' : 'dscHideTableButton',
    'aria-expanded': !isHidden,
    isDisabled,
    toolTipContent: isDisabled ? disabledCollapsingTooltip : label,
    onClick: toggleTable,
  };
};

/**
 * @param sidebarToggleState$
 * @param omitChartButton
 * @param omitTableButton
 * @param dataTestSubjSuffix
 * @constructor
 */
export const PanelsToggle: React.FC<PanelsToggleProps> = ({
  sidebarToggleState$,
  omitChartButton = false,
  omitTableButton = false,
  dataTestSubjSuffix,
}) => {
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));
  const isTableHidden = useAppStateSelector((state) => Boolean(state.hideTable));
  const sidebarToggleState = useObservable(sidebarToggleState$, sidebarToggleState$.getValue());
  const isSidebarHidden = sidebarToggleState.isCollapsed;
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const onToggleChart = useCallback(() => {
    dispatch(updateAppState({ appState: { hideChart: !isChartHidden } }));
  }, [dispatch, isChartHidden, updateAppState]);

  const onToggleTable = useCallback(() => {
    dispatch(updateAppState({ appState: { hideTable: !isTableHidden } }));
  }, [dispatch, isTableHidden, updateAppState]);

  const onToggleSidebar = useCallback(() => {
    sidebarToggleState.toggle?.(!isSidebarHidden);
  }, [isSidebarHidden, sidebarToggleState]);

  const disableHideChart = isTableHidden && !isChartHidden;
  const disableHideTable = isChartHidden && !isTableHidden;

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
        isDisabled: disableHideChart,
      })
    );
  }

  if (!omitTableButton) {
    buttons.push(
      getTableButton({
        isHidden: isTableHidden,
        toggleTable: onToggleTable,
        isDisabled: disableHideTable,
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
