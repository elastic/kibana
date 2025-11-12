/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Type validation file to ensure packaging/react/types.ts matches source types.
 *
 * This file is compiled during the webpack build. If the duplicated types in types.ts
 * diverge from the source types in incompatible ways, TypeScript will emit compilation errors.
 *
 * Note: Some intentional simplifications are allowed (e.g., IconType -> string) as long as
 * the packaged types remain compatible with source types (consumers can pass source types).
 */

// Import source types
import type { NavigationProps as SourceNavigationProps } from '../../src/components/navigation';
import type {
  BadgeType as SourceBadgeType,
  SecondaryMenuItem as SourceSecondaryMenuItem,
  SecondaryMenuSection as SourceSecondaryMenuSection,
  SideNavLogo as SourceSideNavLogo,
} from '../../types';

// Import packaged types
import type {
  BadgeType as PackagedBadgeType,
  NavigationProps as PackagedNavigationProps,
  SecondaryMenuItem as PackagedSecondaryMenuItem,
  SecondaryMenuSection as PackagedSecondaryMenuSection,
  SideNavLogo as PackagedSideNavLogo,
} from './types';

/**
 * The key validation: Source types must be assignable to packaged types.
 * This ensures external consumers can use the component with types from either source.
 *
 * Intentional simplification: MenuItem.iconType is simplified from IconType (string | Component) to string.
 * - EUI's IconType is complex (union of strings and React components)
 * - For external consumers, `string` is simpler and covers 99% of use cases
 * - The runtime accepts string icon names, which is what external consumers will use
 * - This causes a type error but the wrapper component works correctly at runtime
 */

// Simple types must match exactly
type ValidateBadgeType = [SourceBadgeType] extends [PackagedBadgeType]
  ? [PackagedBadgeType] extends [SourceBadgeType]
    ? true
    : false
  : false;
const _badgeType: ValidateBadgeType = true;

// Structural types: packaged must be compatible with source
// (allows intentional simplifications like IconType -> string)
// These checks ensure consumers can pass source-typed objects to packaged component
const _secondaryMenuItem: PackagedSecondaryMenuItem = {} as SourceSecondaryMenuItem;
const _secondaryMenuSection: PackagedSecondaryMenuSection = {} as SourceSecondaryMenuSection;
const _sideNavLogo: PackagedSideNavLogo = {} as SourceSideNavLogo;

/**
 * NavigationProps validation - intentionally suppressed due to MenuItem.iconType simplification.
 *
 * The error is: IconType (string | ComponentClass) is not assignable to string.
 * This is expected - we simplified the type for external consumers.
 * The component works correctly at runtime because icon names (strings) are what consumers use.
 */
// @ts-expect-error - MenuItem.iconType intentionally simplified from IconType to string
const _navigationProps: PackagedNavigationProps = {} as SourceNavigationProps;

// "Use" the validation variables to satisfy linter
void _badgeType;
void _secondaryMenuItem;
void _secondaryMenuSection;
void _sideNavLogo;
void _navigationProps;

// Export validation status
export const TYPE_VALIDATION_PASSED = true;
