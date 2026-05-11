/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { BehaviorSubject } from 'rxjs';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import type { SidebarToggleState } from '../../application/types';
import { usePanelsToggleActions } from './use_panels_toggle_actions';

export interface PanelsToggleProps {
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  omitChartButton?: boolean;
  omitTableButton?: boolean;
  dataTestSubjSuffix?: string;
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
}: {
  isHidden: boolean;
  toggleChart: () => void;
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
    toolTipContent: label,
    onClick: toggleChart,
  };
};

const getTableButton = ({
  isHidden,
  toggleTable,
}: {
  isHidden: boolean;
  toggleTable: () => void;
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
    toolTipContent: label,
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
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { isChartHidden, isSidebarHidden, isTableHidden, toggleChart, toggleSidebar, toggleTable } =
    usePanelsToggleActions({ sidebarToggleState$ });

  const buttons = [];

  if (!isMobile) {
    buttons.push(
      getSidebarButton({
        isHidden: isSidebarHidden,
        toggleSidebar,
      })
    );
  }

  if (!omitChartButton) {
    buttons.push(
      getChartButton({
        isHidden: isChartHidden,
        toggleChart,
      })
    );
  }

  if (!omitTableButton) {
    buttons.push(
      getTableButton({
        isHidden: isTableHidden,
        toggleTable,
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
