/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback } from 'react';

import { Navigation } from './components';
import {
  GroupDefinition,
  NodeDefinition,
  ProjectNavigationDefinition,
  RootNavigationItemDefinition,
} from './types';
import { CloudLink } from './components/cloud_link';
import { RecentlyAccessed } from './components/recently_accessed';
import { NavigationFooter } from './components/navigation_footer';
import { getPresets } from './nav_tree_presets';

const isChromeProjectNavigationNode = (
  item: RootNavigationItemDefinition | NodeDefinition
): item is NodeDefinition => {
  // Only RootNavigationItemDefinition has a "type" property
  return (item as RootNavigationItemDefinition).type === undefined;
};

const getDefaultNavigationTree = (
  projectDefinition: GroupDefinition[]
): Required<ProjectNavigationDefinition>['navigationTree'] => {
  return {
    body: [
      {
        type: 'cloudLink',
        preset: 'deployments',
      },
      ...projectDefinition,
      {
        type: 'group',
        ...getPresets('analytics'),
      },
      {
        type: 'group',
        ...getPresets('ml'),
      },
    ],
    footer: [
      {
        type: 'group',
        ...getPresets('devtools'),
      },
      {
        type: 'group',
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
    (items: Array<RootNavigationItemDefinition | NodeDefinition> = [], path: string[] = []) => {
      return items.map((item) => {
        const isNavigationNode = isChromeProjectNavigationNode(item);
        if (!isNavigationNode) {
          if (item.type === 'cloudLink') {
            return (
              <React.Fragment key={`cloudLink-${idCounter++}`}>
                <CloudLink {...item} />
              </React.Fragment>
            );
          }

          if (item.type === 'recentlyAccessed') {
            return (
              <React.Fragment key={`recentlyAccessed-${idCounter++}`}>
                <RecentlyAccessed {...item} />
              </React.Fragment>
            );
          }
        }

        const id = item.id ?? item.link;

        if (!id) {
          throw new Error(
            `At least one of id or link must be defined for navigation item ${item.title}`
          );
        }

        return (
          <React.Fragment key={id}>
            {item.children ? (
              <Navigation.Group {...item}>
                {renderItems(item.children, [...path, id])}
              </Navigation.Group>
            ) : (
              <Navigation.Item {...item} />
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
