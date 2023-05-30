/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback } from 'react';

import { analytics, devtools, ml, management } from '../nav_tree_presets';
import { Navigation } from './navigation';
import type { NavigationGroupPreset, NodeDefinition } from '../types';

const navTreePresets: { [preset in NavigationGroupPreset]: NodeDefinition } = {
  analytics,
  ml,
  devtools,
  management,
};

export interface Props {
  preset?: NavigationGroupPreset;
  nodeDefinition?: NodeDefinition;
  defaultIsCollapsed?: boolean;
}

export const NavigationBucket: FC<Props> = ({
  nodeDefinition: _nodeDefinition,
  defaultIsCollapsed,
  preset,
}) => {
  const nodeDefinition = preset ? navTreePresets[preset] : _nodeDefinition;

  if (!nodeDefinition) {
    throw new Error('Either preset or nodeDefinition must be defined');
  }

  const renderItems = useCallback(
    (items: NodeDefinition[], isRoot = false) => {
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
                {...item}
                defaultIsCollapsed={
                  isRoot && defaultIsCollapsed !== undefined ? defaultIsCollapsed : undefined
                }
              >
                {renderItems(item.children)}
              </Navigation.Group>
            ) : (
              <Navigation.Item {...item} />
            )}
          </React.Fragment>
        );
      });
    },
    [defaultIsCollapsed]
  );

  return <>{renderItems([nodeDefinition], true)}</>;
};
