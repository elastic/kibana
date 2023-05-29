/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback } from 'react';

import { Navigation } from './components';
import type {
  GroupDefinition,
  NavigationGroupPreset,
  NavigationTreeDefinition,
  NodeDefinition,
  ProjectNavigationDefinition,
  ProjectNavigationTreeDefinition,
  RootNavigationItemDefinition,
} from './types';
import { CloudLink } from './components/cloud_link';
import { RecentlyAccessed } from './components/recently_accessed';
import { NavigationFooter } from './components/navigation_footer';
import { getPresets } from './nav_tree_presets';

type NodeDefinitionWithPreset = NodeDefinition & { preset?: NavigationGroupPreset };

const isRootNavigationItemDefinition = (
  item: RootNavigationItemDefinition | NodeDefinitionWithPreset
): item is RootNavigationItemDefinition => {
  // Only RootNavigationItemDefinition has a "type" property
  return (item as RootNavigationItemDefinition).type !== undefined;
};

const getDefaultNavigationTree = (
  projectDefinition: ProjectNavigationTreeDefinition
): NavigationTreeDefinition => {
  return {
    body: [
      {
        type: 'cloudLink',
        preset: 'deployments',
      },
      {
        type: 'recentlyAccessed',
      },
      ...projectDefinition.map((def) => ({ ...def, type: 'navGroup' as const })),
      {
        type: 'navGroup',
        ...getPresets('analytics'),
      },
      {
        type: 'navGroup',
        ...getPresets('ml'),
      },
    ],
    footer: [
      {
        type: 'navGroup',
        ...getPresets('devtools'),
      },
      {
        type: 'navGroup',
        ...getPresets('management'),
      },
    ],
  };
};

let idCounter = 0;

export const DefaultNavigation: FC<ProjectNavigationDefinition> = ({
  homeRef,
  projectNavigationTree,
  navigationTree,
}) => {
  if (!navigationTree && !projectNavigationTree) {
    throw new Error('One of navigationTree or projectNavigationTree must be defined');
  }

  const navigationDefinition = !navigationTree
    ? getDefaultNavigationTree(projectNavigationTree!)
    : navigationTree!;

  const renderItems = useCallback(
    (
      items: Array<RootNavigationItemDefinition | NodeDefinitionWithPreset> = [],
      path: string[] = []
    ) => {
      return items.map((item) => {
        const isRootNavigationItem = isRootNavigationItemDefinition(item);
        if (isRootNavigationItem) {
          if (item.type === 'cloudLink') {
            return <CloudLink {...item} key={`cloudLink-${idCounter++}`} />;
          }

          if (item.type === 'recentlyAccessed') {
            return <RecentlyAccessed {...item} key={`recentlyAccessed-${idCounter++}`} />;
          }
        }

        if (item.preset) {
          return <Navigation.Group preset={item.preset} key={item.preset} />;
        }

        const id = item.id ?? item.link;

        if (!id) {
          throw new Error(
            `At least one of id or link must be defined for navigation item ${item.title}`
          );
        }

        const { type, ...rest } = item as GroupDefinition;

        return (
          <React.Fragment key={id}>
            {rest.children ? (
              <Navigation.Group {...rest}>
                {renderItems(rest.children, [...path, id])}
              </Navigation.Group>
            ) : (
              <Navigation.Item {...rest} />
            )}
          </React.Fragment>
        );
      });
    },
    []
  );

  return (
    <Navigation homeRef={homeRef}>
      <>
        {renderItems(navigationDefinition.body)}
        {navigationDefinition.footer && (
          <NavigationFooter>{renderItems(navigationDefinition.footer)}</NavigationFooter>
        )}
      </>
    </Navigation>
  );
};
