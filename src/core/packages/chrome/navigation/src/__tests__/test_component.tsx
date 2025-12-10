/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';

import { Navigation } from '../components/navigation';
import type { MenuItem, NavigationStructure, SecondaryMenuItem, SideNavLogo } from '../../types';
import { usePreventLinkNavigation } from '../hooks/use_prevent_link_navigation';

interface TestComponentProps {
  isCollapsed?: boolean;
  initialActiveItemId?: string;
  items: NavigationStructure;
  logo: SideNavLogo;
}

export const TestComponent = ({
  isCollapsed = false,
  initialActiveItemId,
  items,
  logo,
}: TestComponentProps) => {
  const [activeItemId, setActiveItemId] = useState(initialActiveItemId);
  const [collapsed, setCollapsed] = useState(isCollapsed);

  const handleItemClick = (item: SideNavLogo | MenuItem | SecondaryMenuItem) => {
    setActiveItemId(item.id);
  };

  usePreventLinkNavigation();

  return (
    <I18nProvider>
      <Navigation
        activeItemId={activeItemId}
        isCollapsed={collapsed}
        items={items}
        logo={logo}
        onItemClick={handleItemClick}
        onToggleCollapsed={setCollapsed}
        setWidth={() => {}}
      />
    </I18nProvider>
  );
};
