/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import { getPresets } from '../nav_tree_presets';
import { Navigation } from './navigation';
import type { NavigationGroupPreset } from '../types';

const navTreePresets = getPresets('all');

export interface Props<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> {
  preset?: NavigationGroupPreset;
  nodeDefinition?: NodeDefinition<LinkId, Id, ChildrenId>;
  defaultIsCollapsed?: boolean;
}

export function NavigationBucket<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>({ nodeDefinition: _nodeDefinition, defaultIsCollapsed, preset }: Props<LinkId, Id, ChildrenId>) {
  const nodeDefinition = preset
    ? (navTreePresets[preset] as NodeDefinition<LinkId, Id, ChildrenId>)
    : _nodeDefinition;

  if (!nodeDefinition) {
    throw new Error('Either preset or nodeDefinition must be defined');
  }

  const renderItems = useCallback(
    (items: Array<NodeDefinition<LinkId, Id, ChildrenId>>, isRoot = false) => {
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
}
