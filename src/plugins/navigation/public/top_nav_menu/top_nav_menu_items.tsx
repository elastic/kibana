/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiHeaderLinks } from '@elastic/eui';
import React from 'react';
import type { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';

export const TopNavMenuItems = ({
  config,
  className,
}: {
  config: TopNavMenuData[] | undefined;
  className?: string;
}) => {
  if (!config || config.length === 0) return null;
  return (
    <EuiHeaderLinks data-test-subj="top-nav" gutterSize="xs" className={className}>
      {config.map((menuItem: TopNavMenuData, i: number) => {
        return <TopNavMenuItem key={`nav-menu-${i}`} {...menuItem} />;
      })}
    </EuiHeaderLinks>
  );
};
