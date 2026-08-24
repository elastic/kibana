/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { DistributiveOmit } from '@elastic/eui';
import type { AppMenuStaticItem } from '@kbn/ui-app-menu';
import type { AppHeaderBack, AppHeaderConfig } from './types';
import { AppHeaderShell } from './app_header_shell';
import { AppBadges } from './app_badges';
import { AppTabs } from './app_tabs';
import { TitleArea } from './title_area';
import { TitleActions } from './title_actions';
import { AppMenu } from './app_menu';
import { AppHeaderMetadata } from './app_header_metadata';
import { AppHeaderDescription } from './app_header_description';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

export type AppHeaderViewProps = DistributiveOmit<AppHeaderConfig, 'back'> & {
  back?: AppHeaderBack | AppHeaderBack[];
  /**
   * Uses CSS `position: sticky` to keep title and back visible while the page scrolls. Defaults to
   * `true`; set `false` only when the surrounding layout already pins the header in the correct
   * scroll container. A header-height wrapper prevents CSS sticky.
   */
  sticky?: boolean;
  staticItems?: AppMenuStaticItem[];
  /** Legacy action-menu mount, used when no structured `menu` is provided. */
  fallbackMenu?: ReactNode;
  /**
   * Discover-specific title-row slot. Other apps should use `tabs` or `badges`.
   */
  titleAppend?: ReactNode;
  borderless?: boolean;
};

const getPublicAppHeaderViewProps = ({
  title,
  back,
  tabs,
  badges,
  menu,
  favorite,
  share,
  description,
  metadata,
  sticky,
  spacing,
  staticItems,
  fallbackMenu,
  titleAppend,
  borderless,
}: AppHeaderViewProps): AppHeaderViewProps => {
  const secondaryContent = description ? { description } : metadata ? { metadata } : {};

  return {
    title,
    back,
    tabs,
    badges,
    menu,
    favorite,
    share,
    ...secondaryContent,
    sticky,
    spacing,
    staticItems,
    fallbackMenu,
    titleAppend,
    borderless,
  };
};

const AppHeaderViewInternal = React.memo<AppHeaderViewProps>(
  ({
    title,
    back,
    tabs,
    badges,
    menu,
    favorite,
    share,
    titleAppend,
    description,
    metadata,
    sticky,
    spacing,
    borderless,
    staticItems,
    fallbackMenu,
  }) => {
    const hasStaticItems = !!staticItems?.some((item) => !item.global);

    // Sparse legacy states (only a back and/or overflow-menu button, no title or other content) look
    // too tall at the standard height, so default them to the shorter `compact` spacing. An explicit
    // `spacing` from the caller always wins.
    const isSparse =
      title === undefined &&
      !badges?.length &&
      !tabs?.length &&
      !description &&
      !metadata?.length &&
      !titleAppend &&
      !favorite &&
      !share;
    const resolvedSpacing = spacing ?? (isSparse ? 'compact' : 'standard');

    // Match the title size to the spacing: the shorter `compact` header uses an `xs` title, while the
    // roomier standard/bleed headers use `s`.
    const titleSize = resolvedSpacing === 'compact' ? 'xs' : 's';

    const show =
      title !== undefined ||
      back !== undefined ||
      !!tabs?.length ||
      !!badges?.length ||
      !!menu?.items?.length ||
      !!titleAppend ||
      !!share ||
      !!favorite ||
      !!description ||
      !!metadata?.length ||
      hasStaticItems ||
      !!fallbackMenu;

    if (!show) {
      return null;
    }

    return (
      <AppHeaderShell
        title={<TitleArea title={title} back={back} size={titleSize} />}
        badges={<AppBadges badges={badges} />}
        titleActions={<TitleActions shareAction={share} favorite={favorite} />}
        titleAppend={titleAppend}
        trailing={<AppMenu menu={menu} staticItems={staticItems} fallbackMenu={fallbackMenu} />}
        secondaryContent={
          description ? (
            <AppHeaderDescription description={description} />
          ) : metadata?.length ? (
            <AppHeaderMetadata metadata={metadata} />
          ) : undefined
        }
        secondaryContentTestSubj={
          description
            ? APP_HEADER_TEST_SUBJECTS.description
            : metadata?.length
            ? APP_HEADER_TEST_SUBJECTS.metadata
            : undefined
        }
        tabs={tabs?.length ? <AppTabs tabs={tabs} /> : undefined}
        sticky={sticky}
        spacing={resolvedSpacing}
        borderless={borderless}
      />
    );
  }
);

AppHeaderViewInternal.displayName = 'AppHeaderViewInternal';

export const AppHeaderView = React.memo<AppHeaderViewProps>((props) => {
  return <AppHeaderViewInternal {...getPublicAppHeaderViewProps(props)} />;
});

AppHeaderView.displayName = 'AppHeaderView';
