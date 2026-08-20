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
import {
  AppHeaderView as AppHeaderPresentation,
  type AppHeaderViewProps as AppHeaderPresentationProps,
} from '@kbn/ui-app-header';
import type { AppHeaderBack, AppHeaderConfig, AppHeaderSpacing, AppHeaderTitle } from '../types';
import {
  useAppHeaderStaticItems,
  useBackNavTargets,
  useInlineAppHeader,
  useLegacyActionMenu,
  useResolvedBadges,
} from './hooks';
import { LegacyHeaderActionMenu } from './legacy_action_menu';

export type AppHeaderViewProps = DistributiveOmit<AppHeaderConfig, 'back' | 'spacing'> & {
  back?: AppHeaderBack | AppHeaderBack[];
  /**
   * Uses CSS `position: sticky` to keep title and back visible while the page scrolls. Defaults to
   * `true`; set `false` only when the surrounding layout already pins the header in the correct
   * scroll container. A header-height wrapper prevents CSS sticky.
   */
  sticky?: boolean;
  /**
   * Controls the horizontal inset. `standard` keeps the 16px symmetric gutter. When omitted it
   * defaults to `standard`, except a titleless header (only a back and/or overflow button) defaults
   * to `compact` so sparse legacy states don't look too tall. Bleed modes are compatibility options
   * for headers that cannot yet move outside a padded parent.
   */
  spacing?: AppHeaderSpacing;
  docLink?: string;
  showAddIntegrations?: boolean;
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
  docLink,
  showAddIntegrations,
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
    docLink,
    showAddIntegrations,
  };
};

const usePresentationProps = (
  props: AppHeaderViewProps,
  extras?: Pick<AppHeaderPresentationProps, 'titleAppend' | 'borderless'>
): AppHeaderPresentationProps => {
  const publicProps = getPublicAppHeaderViewProps(props);
  const back = useBackNavTargets(publicProps.back);
  const resolvedBadges = useResolvedBadges(publicProps.badges);
  const staticItems = useAppHeaderStaticItems({
    docLink: publicProps.docLink,
    showAddIntegrations: publicProps.showAddIntegrations,
  });
  const legacyActionMenu = useLegacyActionMenu();
  const { docLink, showAddIntegrations, ...rest } = publicProps;

  return {
    ...rest,
    back,
    badges: resolvedBadges,
    staticItems,
    fallbackMenu:
      !publicProps.menu && legacyActionMenu ? (
        <LegacyHeaderActionMenu mount={legacyActionMenu} />
      ) : undefined,
    ...extras,
  };
};

export const AppHeaderView = React.memo<AppHeaderViewProps>((props) => {
  const presentationProps = usePresentationProps(props);
  return <AppHeaderPresentation {...presentationProps} />;
});

AppHeaderView.displayName = 'AppHeaderView';

export type AppHeaderProps = AppHeaderViewProps & { title: AppHeaderTitle };

export const AppHeader = React.memo<AppHeaderProps>((props) => {
  useInlineAppHeader();
  const presentationProps = usePresentationProps(props);
  return <AppHeaderPresentation {...presentationProps} title={props.title} />;
});

AppHeader.displayName = 'AppHeader';

export type DiscoverAppHeaderProps = AppHeaderProps & {
  tabsBar?: ReactNode;
};

export const DiscoverAppHeader = React.memo<DiscoverAppHeaderProps>(({ tabsBar, ...props }) => {
  useInlineAppHeader();
  const presentationProps = usePresentationProps(props, {
    titleAppend: tabsBar,
    borderless: tabsBar != null,
  });
  return <AppHeaderPresentation {...presentationProps} title={props.title} />;
});

DiscoverAppHeader.displayName = 'DiscoverAppHeader';
