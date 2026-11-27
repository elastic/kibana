/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, type MutableRefObject, type Ref } from 'react';
import useMount from 'react-use/lib/useMount';
import { i18n } from '@kbn/i18n';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { setChartHidden, setSidebarHidden, setTableHidden } from '@kbn/discover-utils';
import { useAppStateSelector } from '../../application/main/state_management/redux';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../application/main/state_management/redux';
import { useDiscoverServices } from '../../hooks/use_discover_services';

const disabledCollapsingTooltip = i18n.translate(
  'discover.panelsToggle.atLeastOnePanelMustRemain',
  {
    defaultMessage: 'You must keep at least one area visible',
  }
);

export interface PanelsToggleProps {
  omitChartButton?: boolean;
  omitTableButton?: boolean;
  dataTestSubjSuffix?: string;
  /**
   * Shared between the toggles rendered in the chart toolbar and in the table toolbar.
   * Toggling the chart unmounts one of them, so the one that mounts next takes over focus.
   */
  chartButtonFocusOnMountRef?: MutableRefObject<boolean>;
}

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
  buttonRef,
}: {
  isHidden: boolean;
  toggleChart: () => void;
  isDisabled?: boolean;
  buttonRef: Ref<HTMLButtonElement>;
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
    buttonRef,
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
    iconType: isHidden ? 'transitionBottomIn' : 'transitionBottomOut',
    'data-test-subj': isHidden ? 'dscShowTableButton' : 'dscHideTableButton',
    'aria-expanded': !isHidden,
    isDisabled,
    toolTipContent: isDisabled ? disabledCollapsingTooltip : label,
    onClick: toggleTable,
  };
};

/**
 * @param omitChartButton
 * @param omitTableButton
 * @param dataTestSubjSuffix
 * @param chartButtonFocusOnMountRef
 * @constructor
 */
export const PanelsToggle: React.FC<PanelsToggleProps> = ({
  omitChartButton = false,
  omitTableButton = false,
  dataTestSubjSuffix,
  chartButtonFocusOnMountRef,
}) => {
  const { storage } = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));
  const isTableHidden = useAppStateSelector((state) => Boolean(state.hideTable));
  const isSidebarHidden = useAppStateSelector((state) => Boolean(state.hideSidebar));
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const chartButtonRef = useRef<HTMLButtonElement>(null);

  const onToggleChart = useCallback(() => {
    const hideChart = !isChartHidden;
    if (chartButtonFocusOnMountRef) {
      // toggling the chart moves the chart button to the other toolbar; flag it to take over focus
      chartButtonFocusOnMountRef.current = true;
    }
    setChartHidden(storage, 'discover', hideChart);
    dispatch(updateAppState({ appState: { hideChart } }));
  }, [chartButtonFocusOnMountRef, dispatch, isChartHidden, storage, updateAppState]);

  useMount(() => {
    if (chartButtonFocusOnMountRef?.current && chartButtonRef.current) {
      chartButtonFocusOnMountRef.current = false;
      chartButtonRef.current.focus();
    }
  });

  const onToggleTable = useCallback(() => {
    const hideTable = !isTableHidden;
    setTableHidden(storage, 'discover', hideTable);
    dispatch(updateAppState({ appState: { hideTable } }));
  }, [dispatch, isTableHidden, storage, updateAppState]);

  const onToggleSidebar = useCallback(() => {
    const hideSidebar = !isSidebarHidden;
    setSidebarHidden(storage, 'discover', hideSidebar);
    dispatch(updateAppState({ appState: { hideSidebar } }));
  }, [dispatch, isSidebarHidden, storage, updateAppState]);

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
        buttonRef: chartButtonRef,
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
