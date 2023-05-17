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

interface Props {
  navTree: ChromeProjectNavigationNode[];
}

export const DefaultNavigation: FC<Props> = ({ navTree }) => {
  // Temp logic to demo removing items from the tree
  const [removedItems, setRemovedItems] = useState<string[]>([]);

  const onRemove = useCallback((id: string) => {
    setRemovedItems((prevItems) => [...prevItems, id]);
  }, []);

  const renderItems = useCallback(
    (items: ChromeProjectNavigationNode[], parent: string = '') => {
      const filtered = items.filter(({ id: _id, link = '' }) => {
        const id = `${parent}${_id ?? link}`;
        return !removedItems.includes(id ?? link);
      });

      return filtered.map((item) => (
        <React.Fragment key={item.id}>
          {item.children ? (
            <Navigation.Group
              id={item.id}
              title={item.title}
              onRemove={() => onRemove(`${parent}${item.id}`)}
            >
              {renderItems(item.children, `${parent}${item.id}`)}
            </Navigation.Group>
          ) : (
            <Navigation.Item
              id={item.id}
              link={item.link}
              title={item.title}
              onRemove={() => onRemove(`${parent}${item.id}`)}
            />
          )}
        </React.Fragment>
      ));
    },
    [removedItems, onRemove]
  );

  const filteredNavTree = navTree.filter(({ id: _id, link }) => {
    const id = _id ?? link;
    return !removedItems.includes(id ?? '');
  });

  return <Navigation onRootItemRemove={onRemove}>{renderItems(filteredNavTree)}</Navigation>;
};
