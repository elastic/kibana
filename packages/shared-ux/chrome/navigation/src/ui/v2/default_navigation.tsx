/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useState } from 'react';
import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { Navigation } from './components';

/**
 * @public
 */
export interface DefaultNavigationProps {
  /**
   * The URL href for the home link
   */
  homeRef: string;
  /**
   * A navigation tree structure with object items containing labels, links, and sub-items
   */
  navTree: ChromeProjectNavigationNode[];
}

export const DefaultNavigation: FC<DefaultNavigationProps> = ({ homeRef, navTree }) => {
  // Temp logic to demo removing items from the tree
  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());

  const onRemove = useCallback((path: string[]) => {
    setRemovedItems((prevItems) => {
      const newItems = new Set(prevItems);
      newItems.add(path.join('.'));
      return newItems;
    });
  }, []);

  const renderItems = useCallback(
    (items: ChromeProjectNavigationNode[], path: string[] = []) => {
      const filtered = items.filter(({ id: _id, link = '' }) => {
        const id = _id ?? link;
        const itemPath = (id ? [...path, id] : path).join('.');
        return !removedItems.has(itemPath);
      });

      return filtered.map((item) => {
        const id = item.id ?? item.link;

        if (!id) {
          throw new Error(
            `At least one of id or link must be defined for navigation item ${item.title}`
          );
        }

        return (
          <React.Fragment key={id}>
            {item.children ? (
              <Navigation.Group id={item.id} link={item.link} title={item.title}>
                {renderItems(item.children, [...path, id])}
              </Navigation.Group>
            ) : (
              <Navigation.Item id={item.id} link={item.link} title={item.title} />
            )}
          </React.Fragment>
        );
      });
    },
    [removedItems]
  );

  const filteredNavTree = navTree.filter(({ id: _id, link }) => {
    const id = _id ?? link;
    return !removedItems.has(id ?? '');
  });

  return (
    <Navigation
      homeRef={homeRef}
      onRootItemRemove={(id) => {
        onRemove([id]);
      }}
    >
      {renderItems(filteredNavTree)}
    </Navigation>
  );
};
