/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { LeaderKeyShortcut } from '@kbn/unified-shortcuts';
import type { UnifiedTabsRef } from '@kbn/unified-tabs';

export const useTabShortcuts = () => {
  const unifiedTabsRef = useRef<UnifiedTabsRef | null>(null);
  const shortcuts = useMemo<LeaderKeyShortcut[]>(
    () => [
      {
        key: 'n',
        label: 'n',
        description: i18n.translate('discover.tabsView.shortcut.newTab', {
          defaultMessage: 'New',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.add();
        },
      },
      {
        key: 'x',
        label: 'x',
        description: i18n.translate('discover.tabsView.shortcut.closeCurrentTab', {
          defaultMessage: 'Close',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.closeSelected();
        },
      },
      {
        key: 'u',
        label: 'u',
        description: i18n.translate('discover.tabsView.shortcut.restoreLastClosedTab', {
          defaultMessage: 'Reopen',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.restoreLastClosed();
        },
      },
      {
        key: 'ArrowLeft',
        label: '←',
        description: i18n.translate('discover.tabsView.shortcut.previousTab', {
          defaultMessage: 'Previous',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.selectPrevious();
        },
      },
      {
        key: 'ArrowRight',
        label: '→',
        description: i18n.translate('discover.tabsView.shortcut.nextTab', {
          defaultMessage: 'Next',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.selectNext();
        },
      },
      {
        key: 'd',
        label: 'd',
        description: i18n.translate('discover.tabsView.shortcut.duplicateCurrentTab', {
          defaultMessage: 'Duplicate',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.duplicateSelected();
        },
      },
      {
        key: 'r',
        label: 'r',
        description: i18n.translate('discover.tabsView.shortcut.renameCurrentTab', {
          defaultMessage: 'Rename',
        }),
        onTrigger: () => {
          unifiedTabsRef.current?.enterRenamingMode();
        },
      },
    ],
    [unifiedTabsRef]
  );

  return { unifiedTabsRef, shortcuts };
};
