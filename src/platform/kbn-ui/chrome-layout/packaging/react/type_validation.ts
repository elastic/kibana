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
import type { LayoutAppearance as SourceLayoutAppearance } from '../../src/layout.types';
import type { GridLayoutGlobalStylesProps as SourceGridLayoutGlobalStylesProps } from '../../src/layouts/grid_global_app_style';
import type { CSSVarName as SourceCSSVarName } from '../../src/constants';
import type { HighContrastSeparatorOptions as SourceHighContrastSeparatorOptions } from '../../src/utils';

// Packaged types.
import type {
  ChromeLayoutConfig as PackagedChromeLayoutConfig,
  LayoutAppearance as PackagedLayoutAppearance,
  GridLayoutGlobalStylesProps as PackagedGridLayoutGlobalStylesProps,
  CSSVarName as PackagedCSSVarName,
  HighContrastSeparatorOptions as PackagedHighContrastSeparatorOptions,
} from './types';

// LayoutAppearance must match exactly.
type ValidateLayoutAppearance = [SourceLayoutAppearance] extends [PackagedLayoutAppearance]
  ? [PackagedLayoutAppearance] extends [SourceLayoutAppearance]
    ? true
    : false
  : false;
const _layoutAppearance: ValidateLayoutAppearance = true;

// Structural types: packaged must be compatible with source.
const _layoutConfig: PackagedChromeLayoutConfig = {} as SourceLayoutConfig;
const _gridLayoutGlobalStylesProps: PackagedGridLayoutGlobalStylesProps =
  {} as SourceGridLayoutGlobalStylesProps;
const _cssVarName: PackagedCSSVarName = 'banner.height';
const _sourceCssVarName: SourceCSSVarName = _cssVarName;
const _highContrastSeparatorOptions: PackagedHighContrastSeparatorOptions =
  {} as SourceHighContrastSeparatorOptions;

// ChromeLayoutProps validation is suppressed because the packaged `Slot` type
// uses a simplified `ReactNode` that excludes `ReactPortal` / `ReactFragment`.
// The functional API (passing ReactElement, string, number, null, functions) is
// fully compatible; only edge-case portal/fragment props differ.

void _layoutAppearance;
void _layoutConfig;
void _gridLayoutGlobalStylesProps;
void _cssVarName;
void _sourceCssVarName;
void _highContrastSeparatorOptions;

export const TYPE_VALIDATION_PASSED = true;
