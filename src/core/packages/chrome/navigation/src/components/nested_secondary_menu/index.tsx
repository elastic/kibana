/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, ReactNode, FC } from 'react';

import { SecondaryMenu } from '../secondary_menu';
import { NestedMenuContext } from '../../hooks/use_nested_menu';
import { Panel } from './menu_panel';
import { Header } from './header';
import { Item } from './menu_item';
import { PrimaryMenuItem } from './primary_menu_item';

interface NestedSecondaryMenuProps {
  children: ReactNode;
  initialPanel?: string;
}

const NestedSecondaryMenuRoot: FC<NestedSecondaryMenuProps> = ({
  children,
  initialPanel = 'main',
}) => {
  const [currentPanel, setCurrentPanel] = useState(initialPanel);
  const [panelStack, setPanelStack] = useState<string[]>([]);

  const goToPanel = useCallback(
    (panelId: string) => {
      setPanelStack((prev) => [...prev, currentPanel]);
      setCurrentPanel(panelId);
    },
    [currentPanel]
  );

  const goBack = useCallback(() => {
    const previousPanel = panelStack[panelStack.length - 1];
    if (previousPanel) {
      setCurrentPanel(previousPanel);
      setPanelStack((prev) => prev.slice(0, -1));
    }
  }, [panelStack]);

  const contextValue = {
    currentPanel,
    goToPanel,
    goBack,
    canGoBack: panelStack.length > 0,
  };

  return <NestedMenuContext.Provider value={contextValue}>{children}</NestedMenuContext.Provider>;
};

interface NestedSecondaryMenuComponent extends FC<NestedSecondaryMenuProps> {
  Panel: typeof Panel;
  Header: typeof Header;
  Item: typeof Item;
  PrimaryMenuItem: typeof PrimaryMenuItem;
  Section: typeof SecondaryMenu.Section;
}

export const NestedSecondaryMenu: NestedSecondaryMenuComponent =
  NestedSecondaryMenuRoot as NestedSecondaryMenuComponent;

NestedSecondaryMenu.Panel = Panel;
NestedSecondaryMenu.Header = Header;
NestedSecondaryMenu.Item = Item;
NestedSecondaryMenu.PrimaryMenuItem = PrimaryMenuItem;
NestedSecondaryMenu.Section = SecondaryMenu.Section;
