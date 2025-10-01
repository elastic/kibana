/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';

import type { MenuItem, NavigationStructure } from '../../types';
import { getActiveItems } from '../utils/get_initial_active_items';

interface NavigationState {
  actualActiveItemId: string | undefined;
  visuallyActivePageId: string | undefined;
  visuallyActiveSubpageId: string | undefined;
  openerNode: MenuItem | null;
  isCollapsed: boolean;
  isSidePanelOpen: boolean;
}

export const useNavigation = (
  isCollapsed: boolean,
  items: NavigationStructure,
  logoId: string,
  activeItemId?: string
) => {
  const { primaryItem, secondaryItem, isLogoActive } = useMemo(
    () => getActiveItems(items, activeItemId, logoId),
    [items, activeItemId, logoId]
  );

  const actualActiveItemId = activeItemId;
  const visuallyActivePageId = isLogoActive ? logoId : primaryItem?.id;
  const visuallyActiveSubpageId = secondaryItem?.id;
  const openerNode = primaryItem;
  const isSidePanelOpen = !isCollapsed && !!openerNode?.sections;

  const state: NavigationState = {
    actualActiveItemId,
    visuallyActivePageId,
    visuallyActiveSubpageId,
    openerNode,
    isCollapsed,
    isSidePanelOpen,
  };

  return state;
};
