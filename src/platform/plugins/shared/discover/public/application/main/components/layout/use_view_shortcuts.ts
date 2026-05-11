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
  const { canSwitchLanguageMode, openInspector, switchLanguageMode } = useCurrentTabViewActions({
    currentDataView,
  });
  const { toggleChart, toggleSidebar, toggleTable } = usePanelsToggleActions({
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
        description: i18n.translate('discover.viewShortcuts.visualization', {
          defaultMessage: 'Visualization',
        }),
        onTrigger: () => {
          toggleChart();
        },
      },
      {
        key: 't',
        label: 't',
        description: i18n.translate('discover.viewShortcuts.table', {
          defaultMessage: 'Table',
        }),
        onTrigger: () => {
          toggleTable();
        },
      },
      {
        key: 's',
        label: 's',
        description: i18n.translate('discover.viewShortcuts.sidebar', {
          defaultMessage: 'Sidebar',
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
        description: i18n.translate('discover.viewShortcuts.switchMode', {
          defaultMessage: 'Switch mode',
        }),
        onTrigger: () => {
          switchLanguageMode();
        },
      });
    }

    return shortcuts;
  }, [
    canSwitchLanguageMode,
    openInspector,
    switchLanguageMode,
    toggleChart,
    toggleSidebar,
    toggleTable,
  ]);
};
