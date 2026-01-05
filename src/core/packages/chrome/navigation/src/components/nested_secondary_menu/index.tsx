/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { ReactNode, FC } from 'react';

import { Header } from './header';
import { Item } from './menu_item';
import { NestedMenuContext } from './use_nested_menu';
import { Panel } from './menu_panel';
import { PrimaryMenuItem } from './primary_menu_item';
import { SecondaryMenu } from '../secondary_menu';
import { MAIN_PANEL_ID } from '../../constants';

interface NestedSecondaryMenuProps {
  children: ReactNode;
  initialPanel?: string;
}

interface NestedSecondaryMenuComponent extends FC<NestedSecondaryMenuProps> {
  Header: typeof Header;
  Item: typeof Item;
  Panel: typeof Panel;
  PrimaryMenuItem: typeof PrimaryMenuItem;
  Section: typeof SecondaryMenu.Section;
}

export const NestedSecondaryMenu: NestedSecondaryMenuComponent = ({
  children,
  initialPanel = MAIN_PANEL_ID,
}) => {
  const [currentPanel, setCurrentPanel] = useState(initialPanel);
  const [panelStack, setPanelStack] = useState<Array<{ id: string; returnFocusId?: string }>>([]);
  const [returnFocusId, setReturnFocusId] = useState<string | undefined>();

  const goToPanel = useCallback(
    (panelId: string, focusId?: string) => {
      setPanelStack((prev) => [
        ...prev,
        { id: currentPanel, returnFocusId: focusId || returnFocusId },
      ]);
      setCurrentPanel(panelId);
      setReturnFocusId(undefined);
    },
    [currentPanel, returnFocusId]
  );

  const goBack = useCallback(() => {
    setPanelStack((prev) => {
      const previousPanel = prev[prev.length - 1];
      if (!previousPanel) return prev;

      setCurrentPanel(previousPanel.id);
      setReturnFocusId(previousPanel.returnFocusId);

      return prev.slice(0, -1);
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      canGoBack: panelStack.length > 0,
      currentPanel,
      goBack,
      goToPanel,
      panelStackDepth: panelStack.length,
      returnFocusId,
    }),
    [currentPanel, goBack, goToPanel, panelStack.length, returnFocusId]
  );

  return <NestedMenuContext.Provider value={contextValue}>{children}</NestedMenuContext.Provider>;
};

NestedSecondaryMenu.Header = Header;
NestedSecondaryMenu.Item = Item;
NestedSecondaryMenu.Panel = Panel;
NestedSecondaryMenu.PrimaryMenuItem = PrimaryMenuItem;
NestedSecondaryMenu.Section = SecondaryMenu.Section;
