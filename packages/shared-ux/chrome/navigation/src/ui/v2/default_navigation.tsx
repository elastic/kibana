/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { Navigation } from './components';

const renderItems = (items: ChromeProjectNavigationNode[]) => {
  return items.map((item) => (
    <React.Fragment key={item.id}>
      {item.children ? (
        <Navigation.Group id={item.id} title={item.title}>
          {renderItems(item.children)}
        </Navigation.Group>
      ) : (
        <Navigation.Item id={item.id} link={item.link} title={item.title}>
          {item.title}
        </Navigation.Item>
      )}
    </React.Fragment>
  ));
};

interface Props {
  navTree: ChromeProjectNavigationNode[];
}

export const DefaultNavigation: FC<Props> = ({ navTree }) => {
  return <Navigation>{renderItems(navTree)}</Navigation>;
};
