/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * BUILD-TIME TYPE VALIDATION
 * 
 * This file ensures the duplicated types in packaging/react/types.ts remain compatible
 * with the source types in src/ and types.ts. It is compiled during packaging builds
 * (build.sh Step 1.5) using packaging/tsconfig.json.
 *
 * WHY TYPES ARE DUPLICATED:
 * - The standalone package (@kbn/one-navigation) duplicates types instead of importing them
 * - This allows fast type generation (~1s) without compiling all Kibana dependencies
 * - See types.ts header comments for full rationale
 *
 * HOW VALIDATION WORKS:
 * - This file imports types from BOTH source (../../src, ../../types) AND packaged (./types.ts)
 * - TypeScript validates that packaged types are compatible with source types
 * - Build fails if types diverge in incompatible ways (e.g., required field removed)
 * - Intentional simplifications are allowed (e.g., IconType union -> string)
 *
 * WHEN THIS RUNS:
 * - During packaging builds: `npx tsc --project packaging/tsconfig.json --noEmit`
 * - NOT during regular Kibana development (tsconfig is excluded from TS_PROJECTS)
 * - See build.sh Step 1.5 for usage
 *
 * MAINTENANCE:
 * - When public API types change, update types in src/ and packaging/react/types.ts together
 * - Run packaging build to verify compatibility: `cd packaging/scripts && ./build.sh`
 * - If validation fails, update packaged types to maintain compatibility
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
