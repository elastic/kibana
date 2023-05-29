/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, ReactElement, ReactNode, useEffect } from 'react';

import type { ChromeProjectNavigationNodeEnhanced, NodeProps } from '../types';
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
  const navNodeRef = React.useRef<ChromeProjectNavigationNodeEnhanced | null>(null);

  const { element, children, ...node } = props;
  const unstyled = props.unstyled ?? navigationContext.unstyled;

  let itemRender: (() => ReactElement) | undefined;

  if (!unstyled && children && (typeof children === 'function' || isReactElement(children))) {
    itemRender =
      typeof children === 'function' ? () => children(navNodeRef.current) : () => children;
  }

  const { navNode } = useInitNavNode({ ...node, children, itemRender });

  useEffect(() => {
    navNodeRef.current = navNode;
  }, [navNode]);

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
