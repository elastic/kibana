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
 * Ensures the duplicated types in `packaging/react/types.ts` remain compatible
 * with the source types. Compiled during packaging builds via
 * `packaging/tsconfig.json` with `--noEmit`.
 *
 * - Imports types from BOTH source and packaged locations.
 * - TypeScript will fail the build if types diverge incompatibly.
 * - `MenuItem.iconType` is intentionally simplified from `IconType` to `string`.
 *
 * This file is excluded from regular Kibana development via `TS_PROJECTS`.
 *
 * @see {@link ../tsconfig.json} for the build configuration.
 * @see {@link ./types.ts} for the standalone type definitions.
 */

// Source types.
import type { NavigationProps as SourceNavigationProps } from '../../src/components/navigation';
import type {
  BadgeType as SourceBadgeType,
  SecondaryMenuItem as SourceSecondaryMenuItem,
  SecondaryMenuSection as SourceSecondaryMenuSection,
  SideNavLogo as SourceSideNavLogo,
} from '../../types';

// Packaged types.
import type {
  BadgeType as PackagedBadgeType,
  NavigationProps as PackagedNavigationProps,
  SecondaryMenuItem as PackagedSecondaryMenuItem,
  SecondaryMenuSection as PackagedSecondaryMenuSection,
  SideNavLogo as PackagedSideNavLogo,
} from './types';

// Simple types must match exactly.
type ValidateBadgeType = [SourceBadgeType] extends [PackagedBadgeType]
  ? [PackagedBadgeType] extends [SourceBadgeType]
    ? true
    : false
  : false;
const _badgeType: ValidateBadgeType = true;

// Structural types: packaged must be compatible with source.
const _secondaryMenuItem: PackagedSecondaryMenuItem = {} as SourceSecondaryMenuItem;
const _secondaryMenuSection: PackagedSecondaryMenuSection = {} as SourceSecondaryMenuSection;
const _sideNavLogo: PackagedSideNavLogo = {} as SourceSideNavLogo;

// `NavigationProps` validation — suppressed because `MenuItem.iconType` is
// intentionally simplified from `IconType` (string | ComponentClass) to `string`.
// @ts-expect-error — intentional simplification; see above.
const _navigationProps: PackagedNavigationProps = {} as SourceNavigationProps;

void _badgeType;
void _secondaryMenuItem;
void _secondaryMenuSection;
void _sideNavLogo;
void _navigationProps;

export const TYPE_VALIDATION_PASSED = true;
