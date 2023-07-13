/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, ReactElement, ReactNode, useEffect, useMemo } from 'react';

import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import type { ChromeProjectNavigationNodeEnhanced, NodeProps } from '../types';
import { useInitNavNode } from '../hooks';
import { useNavigation } from './navigation';

export interface Props<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends NodeProps<LinkId, Id, ChildrenId> {
  element?: string;
  unstyled?: boolean;
}

function isReactElement(element: ReactNode): element is ReactElement {
  return React.isValidElement(element);
}

function NavigationItemComp<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(props: Props<LinkId, Id, ChildrenId>) {
  const navigationContext = useNavigation();
  const navNodeRef = React.useRef<ChromeProjectNavigationNodeEnhanced | null>(null);

  const { element, children, node } = useMemo(() => {
    const { element: _element, children: _children, ...rest } = props;
    return {
      element: _element,
      children: _children,
      node: rest,
    };
  }, [props]);
  const unstyled = props.unstyled ?? navigationContext.unstyled;

  let renderItem: (() => ReactElement) | undefined;

  if (!unstyled && children && (typeof children === 'function' || isReactElement(children))) {
    renderItem =
      typeof children === 'function' ? () => children(navNodeRef.current) : () => children;
  }

  const { navNode } = useInitNavNode({ ...node, children, renderItem });

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

export const NavigationItem = React.memo(NavigationItemComp) as typeof NavigationItemComp;
