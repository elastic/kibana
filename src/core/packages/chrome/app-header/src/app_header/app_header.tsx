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
import type { AppHeaderTitle } from '../types';
import {
  useAppHeaderStaticItems,
  useBackNavTargets,
  useInlineAppHeader,
  useLegacyActionMenu,
  useResolvedBadges,
} from './hooks';
import { LegacyHeaderActionMenu } from './legacy_action_menu';

export type AppHeaderViewProps = DistributiveOmit<
  AppHeaderPresentationProps,
  'staticItems' | 'fallbackMenu' | 'titleAppend' | 'borderless' | 'beforePrimaryAction'
> & {
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

/** Resolves chrome-connected header props. `beforePrimaryAction` is a temporary Dashboard-only extra. */
export const usePresentationProps = (
  props: AppHeaderViewProps,
  extras?: Pick<AppHeaderPresentationProps, 'titleAppend' | 'borderless' | 'beforePrimaryAction'>
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
