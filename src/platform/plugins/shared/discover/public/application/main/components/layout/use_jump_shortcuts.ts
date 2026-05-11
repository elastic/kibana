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
import type { LeaderKeyShortcut } from '@kbn/unified-shortcuts';
import type { BehaviorSubject } from 'rxjs';
import { usePanelsToggleActions } from '../../../../components/panels_toggle';
import type { SidebarToggleState } from '../../../types';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import {
  selectIsTabsBarHidden,
  useCurrentTabSelector,
  useInternalStateSelector,
} from '../../state_management/redux';

interface UseJumpShortcutsParams {
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');
const TABS_BAR_SELECTOR =
  '[data-test-subj="unifiedTabs_tabsBar"] [role="tab"][aria-selected="true"]';
const KQL_QUERY_SELECTOR = '[data-test-subj="unifiedQueryInput"] textarea';
const ESQL_QUERY_SELECTOR = '[data-test-subj="unifiedTextLangEditor"] textarea';
const SIDEBAR_SELECTOR = '[data-test-subj="fieldListFiltersFieldSearch"]';
const CHART_SECTION_SELECTOR = '[data-test-subj="unifiedHistogramChartContainer"]';
const TABLE_SECTION_SELECTOR = '[data-test-subj="discoverDocumentsTable"]';
const DOC_VIEWER_SECTION_SELECTOR = '[data-test-subj="kbnDocViewer"]';

const focusElement = (selector: string) => {
  document.querySelector<HTMLElement>(selector)?.focus();
};

const focusFirstFocusableElement = (sectionSelector: string) => {
  const section = document.querySelector<HTMLElement>(sectionSelector);
  section?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
};

const showAndFocus = ({
  isHidden,
  show,
  focus,
}: {
  isHidden: boolean;
  show: () => void;
  focus: () => void;
}) => {
  if (isHidden) {
    show();
    requestAnimationFrame(focus);
  } else {
    focus();
  }
};

export const useJumpShortcuts = ({ sidebarToggleState$ }: UseJumpShortcutsParams) => {
  const isEsqlMode = useIsEsqlMode();
  const hasExpandedDoc = useCurrentTabSelector((tab) => Boolean(tab.expandedDoc));
  const isTabsBarHidden = useInternalStateSelector(selectIsTabsBarHidden);
  const { isChartHidden, isSidebarHidden, isTableHidden, toggleChart, toggleSidebar, toggleTable } =
    usePanelsToggleActions({
      sidebarToggleState$,
    });

  return useMemo<LeaderKeyShortcut[]>(() => {
    const querySelector = isEsqlMode ? ESQL_QUERY_SELECTOR : KQL_QUERY_SELECTOR;

    const shortcuts: LeaderKeyShortcut[] = [
      {
        key: 'q',
        label: 'q',
        description: i18n.translate('discover.jumpShortcuts.query', {
          defaultMessage: 'Query',
        }),
        onTrigger: () => {
          focusElement(querySelector);
        },
      },
      {
        key: 'c',
        label: 'c',
        description: i18n.translate('discover.jumpShortcuts.visualization', {
          defaultMessage: 'Visualization',
        }),
        onTrigger: () => {
          showAndFocus({
            isHidden: isChartHidden,
            show: toggleChart,
            focus: () => focusFirstFocusableElement(CHART_SECTION_SELECTOR),
          });
        },
      },
      {
        key: 't',
        label: 't',
        description: i18n.translate('discover.jumpShortcuts.table', {
          defaultMessage: 'Table',
        }),
        onTrigger: () => {
          showAndFocus({
            isHidden: isTableHidden,
            show: toggleTable,
            focus: () => focusFirstFocusableElement(TABLE_SECTION_SELECTOR),
          });
        },
      },
      {
        key: 's',
        label: 's',
        description: i18n.translate('discover.jumpShortcuts.sidebar', {
          defaultMessage: 'Sidebar',
        }),
        onTrigger: () => {
          showAndFocus({
            isHidden: isSidebarHidden,
            show: toggleSidebar,
            focus: () => focusElement(SIDEBAR_SELECTOR),
          });
        },
      },
    ];

    if (hasExpandedDoc) {
      shortcuts.push({
        key: 'd',
        label: 'd',
        description: isEsqlMode
          ? i18n.translate('discover.jumpShortcuts.resultDetails', {
              defaultMessage: 'Expanded result',
            })
          : i18n.translate('discover.jumpShortcuts.documentDetails', {
              defaultMessage: 'Expanded document',
            }),
        onTrigger: () => {
          focusFirstFocusableElement(DOC_VIEWER_SECTION_SELECTOR);
        },
      });
    }

    if (!isTabsBarHidden) {
      shortcuts.unshift({
        key: 'b',
        label: 'b',
        description: i18n.translate('discover.jumpShortcuts.tabsBar', {
          defaultMessage: 'Tabs',
        }),
        onTrigger: () => {
          focusElement(TABS_BAR_SELECTOR);
        },
      });
    }

    return shortcuts;
  }, [
    isChartHidden,
    isEsqlMode,
    hasExpandedDoc,
    isSidebarHidden,
    isTableHidden,
    isTabsBarHidden,
    toggleChart,
    toggleSidebar,
    toggleTable,
  ]);
};
