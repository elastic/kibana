/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, ReactElement, ReactNode } from 'react';

import { NodeProps } from '../types';
import { useInitNavNode } from '../use_init_navnode';
import { useNavigation } from './navigation';

export interface Props extends NodeProps {
  element?: string;
  unstyled?: boolean;
}

function isReactElement(element: ReactNode): element is ReactElement {
  return React.isValidElement(element);
}

function NavigationItemComp(props: Props) {
  const navigationContext = useNavigation();

  const { element, children, ...node } = props;
  const unstyled = props.unstyled ?? navigationContext.unstyled;

  let itemRender: (() => ReactElement) | undefined;

  if (!unstyled && children && isReactElement(children)) {
    itemRender = () => children;
  }

  const { navNode } = useInitNavNode({ ...node, itemRender });

  if (!navNode || !unstyled) {
    return null;
  }

  if (children) {
    if (typeof children === 'function') {
      return children(navNode);
    }
    return <>{children}</>;
  }

  const Element = element || Fragment;

  return <Element>{navNode.title}</Element>;
}

export const NavigationItem = React.memo(NavigationItemComp);
