/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { LeaderKeyShortcut } from '@kbn/unified-shortcuts';
import type { BehaviorSubject } from 'rxjs';
import { usePanelsToggleActions } from '../../../../components/panels_toggle';
import type { SidebarToggleState } from '../../../types';
import { useCurrentTabViewActions } from '../../hooks/use_current_tab_view_actions';

interface UseViewShortcutsParams {
  currentDataView: DataView | undefined;
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
}

export const useViewShortcuts = ({
  currentDataView,
  sidebarToggleState$,
}: UseViewShortcutsParams) => {
  const { canSwitchLanguageMode, isDataViewMode, openInspector, switchLanguageMode } =
    useCurrentTabViewActions({
      currentDataView,
    });
  const { isChartHidden, isSidebarHidden, isTableHidden, toggleChart, toggleSidebar, toggleTable } =
    usePanelsToggleActions({
      sidebarToggleState$,
    });

  return useMemo<LeaderKeyShortcut[]>(() => {
    const shortcuts: LeaderKeyShortcut[] = [
      {
        key: 'i',
        label: 'i',
        description: i18n.translate('discover.viewShortcuts.inspect', {
          defaultMessage: 'Inspect',
        }),
        onTrigger: () => {
          openInspector();
        },
      },
      {
        key: 'c',
        label: 'c',
        description: isChartHidden
          ? i18n.translate('discover.viewShortcuts.showVisualization', {
              defaultMessage: 'Show visualization',
            })
          : i18n.translate('discover.viewShortcuts.hideVisualization', {
              defaultMessage: 'Hide visualization',
            }),
        onTrigger: () => {
          toggleChart();
        },
      },
      {
        key: 't',
        label: 't',
        description: isTableHidden
          ? i18n.translate('discover.viewShortcuts.showTable', {
              defaultMessage: 'Show table',
            })
          : i18n.translate('discover.viewShortcuts.hideTable', {
              defaultMessage: 'Hide table',
            }),
        onTrigger: () => {
          toggleTable();
        },
      },
      {
        key: 's',
        label: 's',
        description: isSidebarHidden
          ? i18n.translate('discover.viewShortcuts.showSidebar', {
              defaultMessage: 'Show sidebar',
            })
          : i18n.translate('discover.viewShortcuts.hideSidebar', {
              defaultMessage: 'Hide sidebar',
            }),
        onTrigger: () => {
          toggleSidebar();
        },
      },
    ];

    if (canSwitchLanguageMode) {
      shortcuts.splice(1, 0, {
        key: 'm',
        label: 'm',
        description: isDataViewMode
          ? i18n.translate('discover.viewShortcuts.switchToESQL', {
              defaultMessage: 'Switch to ES|QL',
            })
          : i18n.translate('discover.viewShortcuts.switchToClassic', {
              defaultMessage: 'Switch to classic',
            }),
        onTrigger: () => {
          switchLanguageMode();
        },
      });
    }

    return shortcuts;
  }, [
    canSwitchLanguageMode,
    isChartHidden,
    isDataViewMode,
    isSidebarHidden,
    isTableHidden,
    openInspector,
    switchLanguageMode,
    toggleChart,
    toggleSidebar,
    toggleTable,
  ]);
};
