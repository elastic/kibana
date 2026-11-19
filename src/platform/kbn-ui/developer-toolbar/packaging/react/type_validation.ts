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
 *
 * @see {@link ../tsconfig.json} for the build configuration.
 * @see {@link ./types.ts} for the standalone type definitions.
 */

// Source types.
import type {
  DeveloperToolbarProps as SourceDeveloperToolbarProps,
  DeveloperToolbarItemProps as SourceDeveloperToolbarItemProps,
  DeveloperToolbarState as SourceDeveloperToolbarState,
  DeveloperToolbarRegisteredItem as SourceDeveloperToolbarRegisteredItem,
  EnvironmentInfo as SourceEnvironmentInfo,
  MeasureButtonProps as SourceMeasureButtonProps,
} from '../../src';
import {
  DeveloperToolbar as SourceDeveloperToolbar,
  DeveloperToolbarItem as SourceDeveloperToolbarItem,
  MeasureButton as SourceMeasureButton,
  useToolbarState as sourceUseToolbarState,
} from '../../src';

// Packaged types.
import type {
  DeveloperToolbarProps as PackagedDeveloperToolbarProps,
  DeveloperToolbarItemProps as PackagedDeveloperToolbarItemProps,
  DeveloperToolbarState as PackagedDeveloperToolbarState,
  DeveloperToolbarRegisteredItem as PackagedDeveloperToolbarRegisteredItem,
  EnvironmentInfo as PackagedEnvironmentInfo,
  MeasureButtonProps as PackagedMeasureButtonProps,
  DeveloperToolbar as PackagedDeveloperToolbar,
  DeveloperToolbarItem as PackagedDeveloperToolbarItem,
  MeasureButton as PackagedMeasureButton,
  useToolbarState as packagedUseToolbarState,
} from './types';

// Module namespaces: `typeof` a namespace only carries its value exports.
import type * as SourceEntry from '../..';
import type * as PackagedEntry from '.';
import type * as PackagedTypes from './types';

// Structural types: packaged and source must be mutually compatible.
const _envInfo: PackagedEnvironmentInfo = {} as SourceEnvironmentInfo;
const _envInfoReverse: SourceEnvironmentInfo = {} as PackagedEnvironmentInfo;
const _toolbarProps: PackagedDeveloperToolbarProps = {} as SourceDeveloperToolbarProps;
const _toolbarPropsReverse: SourceDeveloperToolbarProps = {} as PackagedDeveloperToolbarProps;
const _itemProps: PackagedDeveloperToolbarItemProps = {} as SourceDeveloperToolbarItemProps;
const _itemPropsReverse: SourceDeveloperToolbarItemProps = {} as PackagedDeveloperToolbarItemProps;
const _state: PackagedDeveloperToolbarState = {} as SourceDeveloperToolbarState;
const _stateReverse: SourceDeveloperToolbarState = {} as PackagedDeveloperToolbarState;
const _registeredItem: PackagedDeveloperToolbarRegisteredItem =
  {} as SourceDeveloperToolbarRegisteredItem;
const _registeredItemReverse: SourceDeveloperToolbarRegisteredItem =
  {} as PackagedDeveloperToolbarRegisteredItem;
const _measureProps: PackagedMeasureButtonProps = {} as SourceMeasureButtonProps;
const _measurePropsReverse: SourceMeasureButtonProps = {} as PackagedMeasureButtonProps;

// Key equality: mutual assignability alone misses an added optional field, so also
// require both sides to declare exactly the same property names.
type SameKeys<A, B> = [keyof A] extends [keyof B]
  ? [keyof B] extends [keyof A]
    ? true
    : never
  : never;
const _envInfoKeys: SameKeys<SourceEnvironmentInfo, PackagedEnvironmentInfo> = true;
const _packageInfoKeys: SameKeys<
  NonNullable<SourceEnvironmentInfo['packageInfo']>,
  NonNullable<PackagedEnvironmentInfo['packageInfo']>
> = true;
const _toolbarPropsKeys: SameKeys<SourceDeveloperToolbarProps, PackagedDeveloperToolbarProps> =
  true;
const _itemPropsKeys: SameKeys<SourceDeveloperToolbarItemProps, PackagedDeveloperToolbarItemProps> =
  true;
const _stateKeys: SameKeys<SourceDeveloperToolbarState, PackagedDeveloperToolbarState> = true;
const _registeredItemKeys: SameKeys<
  SourceDeveloperToolbarRegisteredItem,
  PackagedDeveloperToolbarRegisteredItem
> = true;
const _measurePropsKeys: SameKeys<SourceMeasureButtonProps, PackagedMeasureButtonProps> = true;

// Runtime exports: source implementations must satisfy the declared signatures.
const _toolbar: typeof PackagedDeveloperToolbar = SourceDeveloperToolbar;
const _item: typeof PackagedDeveloperToolbarItem = SourceDeveloperToolbarItem;
const _measureButton: typeof PackagedMeasureButton = SourceMeasureButton;
const _useToolbarState: typeof packagedUseToolbarState = sourceUseToolbarState;

// Export completeness: the source entry, the declared types and the packaging entry
// must expose exactly the same runtime exports.
const _sourceTypesValueExports: SameKeys<typeof SourceEntry, typeof PackagedTypes> = true;
const _packagedEntryValueExports: SameKeys<typeof PackagedEntry, typeof PackagedTypes> = true;

void _envInfo;
void _envInfoReverse;
void _toolbarProps;
void _toolbarPropsReverse;
void _itemProps;
void _itemPropsReverse;
void _state;
void _stateReverse;
void _registeredItem;
void _registeredItemReverse;
void _measureProps;
void _measurePropsReverse;
void _envInfoKeys;
void _packageInfoKeys;
void _toolbarPropsKeys;
void _itemPropsKeys;
void _stateKeys;
void _registeredItemKeys;
void _measurePropsKeys;
void _toolbar;
void _item;
void _measureButton;
void _useToolbarState;
void _sourceTypesValueExports;
void _packagedEntryValueExports;

export const TYPE_VALIDATION_PASSED = true;
