/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiHeaderLinks } from '@elastic/eui';
import type { AppMenuConfig, AppMenuItemType, AppMenuPrimaryActionItem } from '../types';
import {
  getSecondaryActionItemsForChromeBarV2,
  getSortedOverflowOnlyItems,
  secondaryActionItemToMenuItem,
} from '../utils';
import { AppMenuActionButton } from './app_menu_action_button';
import { AppMenuOverflowButton } from './app_menu_overflow_button';

const showMoreButtonId = 'chrome-bar-v2-show-more';

export interface AppMenuChromeLinksProps {
  gutterSize: 'xxs';
  popoverBreakpoints: 'none';
  className: string;
  'data-test-subj': string;
}

function useChromeBarV2PopoverState() {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  return {
    openPopoverId,
    handlePopoverToggle: (id: string) => {
      setOpenPopoverId((current) => (current === id ? null : id));
    },
    handleOnPopoverClose: () => setOpenPopoverId(null),
  };
}

/**
 * chromeBarV2 on m+ breakpoints: [secondary actions][overflow ⋯][primary action].
 */
export const AppMenuChromeBarV2Wide = ({
  config,
  headerLinksProps,
}: {
  config: AppMenuConfig;
  headerLinksProps: AppMenuChromeLinksProps;
}) => {
  const { openPopoverId, handlePopoverToggle, handleOnPopoverClose } = useChromeBarV2PopoverState();

  const primaryActionItem = config.primaryActionItem;
  const secondaries = getSecondaryActionItemsForChromeBarV2(config);
  const overflowItems = getSortedOverflowOnlyItems(config);

  const primaryWithDefaults: AppMenuPrimaryActionItem | undefined = primaryActionItem
    ? { ...primaryActionItem, isFilled: false }
    : undefined;

  const primaryActionComponent = primaryWithDefaults ? (
    <AppMenuActionButton
      {...primaryWithDefaults}
      isPopoverOpen={openPopoverId === primaryWithDefaults.id}
      onPopoverToggle={() => {
        handlePopoverToggle(primaryWithDefaults.id);
      }}
      onPopoverClose={handleOnPopoverClose}
    />
  ) : null;

  const secondaryActionComponents = secondaries.map((item) => (
    <AppMenuActionButton
      {...item}
      isSecondaryAction
      key={item.id}
      isPopoverOpen={openPopoverId === item.id}
      onPopoverToggle={() => {
        handlePopoverToggle(item.id);
      }}
      onPopoverClose={handleOnPopoverClose}
    />
  ));

  const overflowComponent =
    overflowItems.length > 0 ? (
      <AppMenuOverflowButton
        items={overflowItems}
        isPopoverOpen={openPopoverId === showMoreButtonId}
        onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
        onPopoverClose={handleOnPopoverClose}
      />
    ) : null;

  return (
    <EuiHeaderLinks {...headerLinksProps}>
      {secondaryActionComponents}
      {config.secondaryActionAppend}
      {overflowComponent}
      {primaryActionComponent}
    </EuiHeaderLinks>
  );
};

/**
 * chromeBarV2 on xs–s: one overflow with secondaries + overflow-only rows; primary in popover footer.
 */
export const AppMenuChromeBarV2Collapsed = ({
  config,
  headerLinksProps,
}: {
  config: AppMenuConfig;
  headerLinksProps: AppMenuChromeLinksProps;
}) => {
  const { openPopoverId, handlePopoverToggle, handleOnPopoverClose } = useChromeBarV2PopoverState();

  const primaryActionItem = config.primaryActionItem;
  const secondaries = getSecondaryActionItemsForChromeBarV2(config);
  const overflowItems = getSortedOverflowOnlyItems(config);

  const primaryWithDefaults: AppMenuPrimaryActionItem | undefined = primaryActionItem
    ? { ...primaryActionItem, isFilled: false }
    : undefined;

  const primaryActionComponent = primaryWithDefaults ? (
    <AppMenuActionButton
      {...primaryWithDefaults}
      isPopoverOpen={openPopoverId === primaryWithDefaults.id}
      onPopoverToggle={() => {
        handlePopoverToggle(primaryWithDefaults.id);
      }}
      onPopoverClose={handleOnPopoverClose}
    />
  ) : null;

  const collapsedMenuItems: AppMenuItemType[] = [
    ...secondaries.map((s, index) => secondaryActionItemToMenuItem(s, index + 1)),
    ...overflowItems.map((item, index) => ({
      ...item,
      order: secondaries.length + index + 1,
    })),
  ];

  if (collapsedMenuItems.length === 0) {
    return (
      <EuiHeaderLinks {...headerLinksProps}>
        {config.secondaryActionAppend}
        {primaryActionComponent}
      </EuiHeaderLinks>
    );
  }

  return (
    <EuiHeaderLinks {...headerLinksProps}>
      {config.secondaryActionAppend}
      <AppMenuOverflowButton
        items={collapsedMenuItems}
        isPopoverOpen={openPopoverId === showMoreButtonId}
        primaryActionItem={primaryWithDefaults}
        secondaryActionItem={undefined}
        onPopoverToggle={() => handlePopoverToggle(showMoreButtonId)}
        onPopoverClose={handleOnPopoverClose}
      />
    </EuiHeaderLinks>
  );
};
