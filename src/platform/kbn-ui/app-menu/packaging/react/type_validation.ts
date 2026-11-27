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
 * - Imports types (and value signatures) from BOTH source and packaged locations.
 * - Every check is bidirectional, so TypeScript fails the build if the
 *   standalone types drift from the source in either direction.
 * - The packaged declarations must cover exactly the source's runtime exports.
 *
 * This file is excluded from regular Kibana development via `TS_PROJECTS`.
 *
 * @see {@link ../tsconfig.json} for the build configuration.
 * @see {@link ./types.ts} for the standalone type definitions.
 */

// Source types and values.
import type * as Source from '../..';

// Packaged types and declarations.
import type * as Packaged from './types';

/** `true` only when `A` and `B` are mutually assignable. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Compile-time assertion; resolves to `never` (a compile error) when `T` is not `true`. */
type Assert<T extends true> = T;

// Exported types.
export type CheckAppMenuBreakpointSourceType = Assert<
  Same<Source.AppMenuBreakpointSource, Packaged.AppMenuBreakpointSource>
>;
export type CheckAppMenuLoadingPropsType = Assert<
  Same<Source.AppMenuLoadingProps, Packaged.AppMenuLoadingProps>
>;
export type CheckAppMenuRunActionType = Assert<
  Same<Source.AppMenuRunAction, Packaged.AppMenuRunAction>
>;
export type CheckAppMenuRunActionParamsType = Assert<
  Same<Source.AppMenuRunActionParams, Packaged.AppMenuRunActionParams>
>;
export type CheckAppMenuConfigType = Assert<Same<Source.AppMenuConfig, Packaged.AppMenuConfig>>;
export type CheckAppMenuEbtAttrsType = Assert<
  Same<Source.AppMenuEbtAttrs, Packaged.AppMenuEbtAttrs>
>;
export type CheckAppMenuItemTypeType = Assert<
  Same<Source.AppMenuItemType, Packaged.AppMenuItemType>
>;
export type CheckAppMenuPrimaryActionItemType = Assert<
  Same<Source.AppMenuPrimaryActionItem, Packaged.AppMenuPrimaryActionItem>
>;
export type CheckAppMenuPopoverItemType = Assert<
  Same<Source.AppMenuPopoverItem, Packaged.AppMenuPopoverItem>
>;
export type CheckAppMenuSplitButtonPropsType = Assert<
  Same<Source.AppMenuSplitButtonProps, Packaged.AppMenuSplitButtonProps>
>;
export type CheckAppMenuStaticItemType = Assert<
  Same<Source.AppMenuStaticItem, Packaged.AppMenuStaticItem>
>;

// Exported values: the packaged declarations must match the source signatures.
export type CheckAppMenuComponentValue = Assert<
  Same<typeof Source.AppMenuComponent, typeof Packaged.AppMenuComponent>
>;
export type CheckAppMenuLoadingValue = Assert<
  Same<typeof Source.AppMenuLoading, typeof Packaged.AppMenuLoading>
>;
export type CheckAppMenuItemValue = Assert<
  Same<typeof Source.AppMenuItem, typeof Packaged.AppMenuItem>
>;
export type CheckAppMenuActionButtonValue = Assert<
  Same<typeof Source.AppMenuActionButton, typeof Packaged.AppMenuActionButton>
>;
export type CheckAppMenuOverflowButtonValue = Assert<
  Same<typeof Source.AppMenuOverflowButton, typeof Packaged.AppMenuOverflowButton>
>;
export type CheckAppMenuPopoverValue = Assert<
  Same<typeof Source.AppMenuPopover, typeof Packaged.AppMenuPopover>
>;
export type CheckAppMenuPopoverActionButtonsValue = Assert<
  Same<typeof Source.AppMenuPopoverActionButtons, typeof Packaged.AppMenuPopoverActionButtons>
>;
export type CheckAppMenuItemLimitValue = Assert<
  Same<typeof Source.APP_MENU_ITEM_LIMIT, typeof Packaged.APP_MENU_ITEM_LIMIT>
>;
export type CheckAppMenuEbtElementValue = Assert<
  Same<typeof Source.APP_MENU_EBT_ELEMENT, typeof Packaged.APP_MENU_EBT_ELEMENT>
>;
export type CheckAppMenuEbtOpenMoreActionValue = Assert<
  Same<typeof Source.APP_MENU_EBT_OPEN_MORE_ACTION, typeof Packaged.APP_MENU_EBT_OPEN_MORE_ACTION>
>;
export type CheckAppMenuTestSubjectsValue = Assert<
  Same<typeof Source.APP_MENU_TEST_SUBJECTS, typeof Packaged.APP_MENU_TEST_SUBJECTS>
>;
export type CheckGetAppMenuItemTestSubjValue = Assert<
  Same<typeof Source.getAppMenuItemTestSubj, typeof Packaged.getAppMenuItemTestSubj>
>;
export type CheckGetAppMenuActionButtonTestSubjValue = Assert<
  Same<typeof Source.getAppMenuActionButtonTestSubj, typeof Packaged.getAppMenuActionButtonTestSubj>
>;
export type CheckGetDisplayedItemsAllowedAmountValue = Assert<
  Same<typeof Source.getDisplayedItemsAllowedAmount, typeof Packaged.getDisplayedItemsAllowedAmount>
>;
export type CheckGetShouldOverflowValue = Assert<
  Same<typeof Source.getShouldOverflow, typeof Packaged.getShouldOverflow>
>;
export type CheckIsDisabledValue = Assert<
  Same<typeof Source.isDisabled, typeof Packaged.isDisabled>
>;
export type CheckGetTooltipValue = Assert<
  Same<typeof Source.getTooltip, typeof Packaged.getTooltip>
>;
export type CheckGetAppMenuEbtDomPropsValue = Assert<
  Same<typeof Source.getAppMenuEbtDomProps, typeof Packaged.getAppMenuEbtDomProps>
>;
export type CheckMapAppMenuItemToPanelItemValue = Assert<
  Same<typeof Source.mapAppMenuItemToPanelItem, typeof Packaged.mapAppMenuItemToPanelItem>
>;
export type CheckGetAppMenuItemsValue = Assert<
  Same<typeof Source.getAppMenuItems, typeof Packaged.getAppMenuItems>
>;
export type CheckGetPopoverPanelsValue = Assert<
  Same<typeof Source.getPopoverPanels, typeof Packaged.getPopoverPanels>
>;
export type CheckGetPopoverActionItemsValue = Assert<
  Same<typeof Source.getPopoverActionItems, typeof Packaged.getPopoverActionItems>
>;
export type CheckGetIsSelectedColorValue = Assert<
  Same<typeof Source.getIsSelectedColor, typeof Packaged.getIsSelectedColor>
>;
export type CheckHasNonGlobalStaticItemsValue = Assert<
  Same<typeof Source.hasNonGlobalStaticItems, typeof Packaged.hasNonGlobalStaticItems>
>;

// The packaged declarations must cover exactly the source's runtime exports.
export type CheckAllValuesDeclared = Assert<
  Same<Exclude<keyof typeof Source, keyof typeof Packaged>, never>
>;
export type CheckNoExtraValuesDeclared = Assert<
  Same<Exclude<keyof typeof Packaged, keyof typeof Source>, never>
>;

export const TYPE_VALIDATION_PASSED = true;
