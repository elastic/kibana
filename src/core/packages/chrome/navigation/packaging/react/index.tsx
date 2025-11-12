/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Import type validation to ensure packaged types match source types
// This will cause build failure if types diverge
import './type_validation';

import React from 'react';
import { Navigation, type NavigationProps } from '../../src/components/navigation';
import type {
  BadgeType,
  MenuItem,
  NavigationStructure,
  SecondaryMenuItem,
  SecondaryMenuSection,
  SideNavLogo,
} from '../../types';

// React import is needed for JSX transform
void React;

// Re-export types
export type {
  BadgeType,
  MenuItem,
  NavigationProps,
  NavigationStructure,
  SecondaryMenuItem,
  SecondaryMenuSection,
  SideNavLogo,
};

// OneNavigationProps is identical to NavigationProps
export type OneNavigationProps = NavigationProps;

/**
 * OneNavigation - Standalone Navigation component for external applications.
 *
 * This component provides Elastic's navigation UI for non-Kibana applications.
 * i18n is handled automatically via webpack aliases that redirect
 * @kbn/i18n and @kbn/i18n-react to no-op implementations.
 *
 * @example
 * ```tsx
 * <OneNavigation
 *   items={navigationItems}
 *   logo={logoConfig}
 *   isCollapsed={false}
 *   activeItemId="dashboard"
 *   onItemClick={handleClick}
 *   setWidth={setWidth}
 *   mainContentSelectors={['main', '#app-content']}  // Optional
 *   mainScrollContainerId="app-content"              // Optional
 * />
 * ```
 */
export const OneNavigation = (props: OneNavigationProps) => {
  // No wrapper needed - Navigation component uses i18n which is
  // aliased to no-op implementation via webpack
  return <Navigation {...props} />;
};
