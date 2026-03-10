/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { Action } from '../../components/content_framework/section/section_actions';
import {
  OPEN_IN_DISCOVER_LABEL,
  OPEN_IN_DISCOVER_ARIA_LABEL,
} from '../../components/observability/traces/common/constants';
import { useDocViewerExtensionActionsContext } from '../use_doc_viewer_extension_actions';

interface UseOpenInDiscoverSectionActionParams {
  tabLabel: string;
  dataTestSubj: string;
  href?: string;
  esql?: string;
}

export function useOpenInDiscoverSectionAction(
  params: UseOpenInDiscoverSectionActionParams
): Action | undefined {
  const { href, esql, tabLabel, dataTestSubj } = params;
  const actions = useDocViewerExtensionActionsContext();
  const openInNewTab = actions?.openInNewTab;
  const canOpenInNewTab = openInNewTab && esql;

  const onClick = useCallback(() => {
    if (canOpenInNewTab) {
      openInNewTab({
        query: { esql },
        tabLabel,
      });
    }
  }, [canOpenInNewTab, openInNewTab, esql, tabLabel]);

  return useMemo(() => {
    if (!href && !canOpenInNewTab) {
      return undefined;
    }

    const actionBase = {
      dataTestSubj,
      label: OPEN_IN_DISCOVER_LABEL,
      icon: 'discoverApp',
      ariaLabel: OPEN_IN_DISCOVER_ARIA_LABEL,
    };

    if (href) {
      return {
        ...actionBase,
        href,
        onClick: canOpenInNewTab ? onClick : undefined,
      };
    }

    if (!canOpenInNewTab) {
      return undefined;
    }

    return {
      ...actionBase,
      onClick,
    };
  }, [canOpenInNewTab, dataTestSubj, href, onClick]);
}
