/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Build-time type validation — causes build failure if types diverge.
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

// React import is needed for JSX transform.
void React;

export type {
  BadgeType,
  MenuItem,
  NavigationProps,
  NavigationStructure,
  SecondaryMenuItem,
  SecondaryMenuSection,
  SideNavLogo,
};

/** Alias for the external package. */
export type OneNavigationProps = NavigationProps;

/**
 * `OneNavigation` — standalone navigation component for non-Kibana applications.
 *
 * Wraps the internal `Navigation` component. Kibana-specific dependencies
 * (`@kbn/i18n`, `@kbn/core-chrome-layout-constants`) are replaced at build
 * time via webpack aliases.
 */
export const OneNavigation = (props: OneNavigationProps) => {
  return <Navigation {...props} />;
};
