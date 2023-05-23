/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback } from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { Navigation } from './navigation';
import { analytics, devtools, ml, management } from '../nav_tree_presets';

type Preset = 'analytics' | 'devtools' | 'ml' | 'management';

const navTreePresets: { [preset in Preset]: ChromeProjectNavigationNode } = {
  analytics,
  ml,
  devtools,
  management,
};

interface Props {
  preset?: Preset;
  navNode?: ChromeProjectNavigationNode;
  defaultIsCollapsed?: boolean;
}

export const NavigationBucket: FC<Props> = ({ navNode: _navNode, defaultIsCollapsed, preset }) => {
  const renderItems = useCallback(
    (items: ChromeProjectNavigationNode[], isRoot = false) => {
      return items.map((item) => {
        const id = item.id ?? item.link;

        if (!id) {
          throw new Error(
            `At least one of id or link must be defined for navigation item ${item.title}`
          );
        }

        return (
          <React.Fragment key={id}>
            {item.children ? (
              <Navigation.Group
                id={item.id}
                link={item.link}
                title={item.title}
                icon={item.icon}
                defaultIsCollapsed={
                  isRoot && defaultIsCollapsed !== undefined ? defaultIsCollapsed : undefined
                }
              >
                {renderItems(item.children)}
              </Navigation.Group>
            ) : (
              <Navigation.Item id={item.id} link={item.link} title={item.title} />
            )}
          </React.Fragment>
        );
      });
    },
    [defaultIsCollapsed]
  );

  const navNode = preset ? navTreePresets[preset] : _navNode;

  if (!navNode) {
    throw new Error('Either preset or navNode must be defined');
  }

  return <>{renderItems([navNode], true)}</>;
};
