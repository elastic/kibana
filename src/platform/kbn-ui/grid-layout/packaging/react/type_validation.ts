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
 * This file is excluded from regular Kibana development via `TS_PROJECTS`.
 *
 * @see {@link ../tsconfig.json} for the build configuration.
 * @see {@link ./types.ts} for the standalone type definitions.
 */

// Source types.
import type { GridLayoutProps as SourceGridLayoutProps } from '../../grid/grid_layout';
import type { GridPanelData as SourceGridPanelData } from '../../grid/grid_panel';
import type { GridSectionData as SourceGridSectionData } from '../../grid/grid_section';
import type {
  GridLayoutData as SourceGridLayoutData,
  GridSettings as SourceGridSettings,
  GridAccessMode as SourceGridAccessMode,
} from '../../grid/types';

// Packaged types.
import type {
  GridLayoutProps as PackagedGridLayoutProps,
  GridPanelData as PackagedGridPanelData,
  GridSectionData as PackagedGridSectionData,
  GridLayoutData as PackagedGridLayoutData,
  GridSettings as PackagedGridSettings,
  GridAccessMode as PackagedGridAccessMode,
} from './types';

// GridAccessMode must match exactly.
type ValidateAccessMode = [SourceGridAccessMode] extends [PackagedGridAccessMode]
  ? [PackagedGridAccessMode] extends [SourceGridAccessMode]
    ? true
    : false
  : false;
const _accessMode: ValidateAccessMode = true;

// Structural compatibility checks.
const _gridSettings: PackagedGridSettings = {} as SourceGridSettings;
const _gridPanelData: PackagedGridPanelData = {} as SourceGridPanelData;
const _gridSectionData: PackagedGridSectionData = {} as SourceGridSectionData;
const _gridLayoutData: PackagedGridLayoutData = {} as SourceGridLayoutData;

// GridLayoutProps uses a union (UseCustomDragHandle) — validate structurally.
const _gridLayoutProps: PackagedGridLayoutProps = {} as SourceGridLayoutProps;

void _accessMode;
void _gridSettings;
void _gridPanelData;
void _gridSectionData;
void _gridLayoutData;
void _gridLayoutProps;

export const TYPE_VALIDATION_PASSED = true;
