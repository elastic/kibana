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
 * - `ChromeLayoutProps.children/slots` uses a simplified `Slot` type that
 *   omits `React.ReactPortal` and `React.ReactFragment` from `ReactNode`.
 *
 * This file is excluded from regular Kibana development via `TS_PROJECTS`.
 *
 * @see {@link ../tsconfig.json} for the build configuration.
 * @see {@link ./types.ts} for the standalone type definitions.
 */

// Source types.
import type { LayoutConfig as SourceLayoutConfig } from '../../src/layout_config_context';
import type { ChromeStyle as SourceChromeStyle } from '../../src/layout.types';
import type { GridLayoutGlobalStylesProps as SourceGridLayoutGlobalStylesProps } from '../../src/layouts/grid_global_app_style';

// Packaged types.
import type {
  ChromeLayoutConfig as PackagedChromeLayoutConfig,
  ChromeStyle as PackagedChromeStyle,
  GridLayoutGlobalStylesProps as PackagedGridLayoutGlobalStylesProps,
} from './types';

// ChromeStyle must match exactly.
type ValidateChromeStyle = [SourceChromeStyle] extends [PackagedChromeStyle]
  ? [PackagedChromeStyle] extends [SourceChromeStyle]
    ? true
    : false
  : false;
const _chromeStyle: ValidateChromeStyle = true;

// Structural types: packaged must be compatible with source.
const _layoutConfig: PackagedChromeLayoutConfig = {} as SourceLayoutConfig;
const _gridLayoutGlobalStylesProps: PackagedGridLayoutGlobalStylesProps =
  {} as SourceGridLayoutGlobalStylesProps;

// ChromeLayoutProps validation is suppressed because the packaged `Slot` type
// uses a simplified `ReactNode` that excludes `ReactPortal` / `ReactFragment`.
// The functional API (passing ReactElement, string, number, null, functions) is
// fully compatible; only edge-case portal/fragment props differ.

void _chromeStyle;
void _layoutConfig;
void _gridLayoutGlobalStylesProps;

export const TYPE_VALIDATION_PASSED = true;
