/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useEffect, useMemo } from 'react';

import type { AppDeepLinkId, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { useNavigation as useNavigationServices } from '../../services';
import { useInitNavNode } from '../hooks';
import type { NodeProps } from '../types';
import { useNavigation } from './navigation';

export interface Props<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends NodeProps<LinkId, Id, ChildrenId> {
  unstyled?: boolean;
}

function NavigationItemComp<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(props: Props<LinkId, Id, ChildrenId>) {
  const { cloudLinks } = useNavigationServices();
  const navigationContext = useNavigation();
  const navNodeRef = React.useRef<ChromeProjectNavigationNode | null>(null);

  const { children, node } = useMemo(() => {
    const { children: _children, ...rest } = props;
    return {
      children: _children,
      node: rest,
    };
  }, [props]);
  const unstyled = props.unstyled ?? navigationContext.unstyled;

  const { navNode } = useInitNavNode({ ...node, children }, { cloudLinks });

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

  return <Fragment>{navNode.title}</Fragment>;
}

export const NavigationItem = React.memo(NavigationItemComp) as typeof NavigationItemComp;
