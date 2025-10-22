/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode, FC } from 'react';
import React, { useState, useCallback } from 'react';

import { SecondaryMenu } from '../secondary_menu';
import { NestedMenuContext } from './use_nested_menu';
import { Panel } from './menu_panel';
import { Header } from './header';
import { Item } from './menu_item';
import { PrimaryMenuItem } from './primary_menu_item';

interface NestedSecondaryMenuProps {
  children: ReactNode;
  initialPanel?: string;
}

interface NestedSecondaryMenuComponent extends FC<NestedSecondaryMenuProps> {
  Panel: typeof Panel;
  Header: typeof Header;
  Item: typeof Item;
  PrimaryMenuItem: typeof PrimaryMenuItem;
  Section: typeof SecondaryMenu.Section;
}

export const NestedSecondaryMenu: NestedSecondaryMenuComponent = ({
  children,
  initialPanel = 'main',
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

  const contextValue = {
    canGoBack: panelStack.length > 0,
    currentPanel,
    goBack,
    goToPanel,
    panelStackDepth: panelStack.length,
    returnFocusId,
  };

  return <NestedMenuContext.Provider value={contextValue}>{children}</NestedMenuContext.Provider>;
};

NestedSecondaryMenu.Panel = Panel;
NestedSecondaryMenu.Header = Header;
NestedSecondaryMenu.Item = Item;
NestedSecondaryMenu.PrimaryMenuItem = PrimaryMenuItem;
NestedSecondaryMenu.Section = SecondaryMenu.Section;
