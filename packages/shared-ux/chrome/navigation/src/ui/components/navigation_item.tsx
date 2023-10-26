/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useEffect, useMemo } from 'react';
import type { AppDeepLinkId, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { EuiCollapsibleNavItem } from '@elastic/eui';

import { useNavigation as useNavigationServices } from '../../services';
import { useInitNavNode } from '../hooks';
import type { NodeProps, NodePropsEnhanced } from '../types';
import { useNavigation } from './navigation';
import { getNavigationNodeHref } from '../../utils';

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
  const { cloudLinks, navigateToUrl } = useNavigationServices();
  const navigationContext = useNavigation();
  const navNodeRef = React.useRef<ChromeProjectNavigationNode | null>(null);

  const { children, node } = useMemo(() => {
    const { children: _children, ...rest } = props;
    const nodeEnhanced: Omit<NodePropsEnhanced<LinkId, Id, ChildrenId>, 'children'> = {
      ...rest,
      isGroup: false,
    };
    if (typeof _children === 'string') {
      nodeEnhanced.title = nodeEnhanced.title ?? _children;
    }
    return {
      children: _children,
      node: nodeEnhanced,
    };
  }, [props]);
  const unstyled = props.unstyled ?? navigationContext.unstyled;

  const { navNode } = useInitNavNode(node, { cloudLinks });

  useEffect(() => {
    navNodeRef.current = navNode;
  }, [navNode]);

  if (!navNode) {
    return null;
  }

  if (unstyled) {
    if (children) {
      if (typeof children === 'function') {
        return children(navNode);
      }
      return <>{children}</>;
    }

    return <Fragment>{navNode.title}</Fragment>;
  }

  const isRootLevel = navNode.path.length === 1;

  if (isRootLevel) {
    const href = getNavigationNodeHref(navNode);

    return (
      <EuiCollapsibleNavItem
        id={navNode.id}
        title={navNode.title}
        icon={navNode.icon}
        iconProps={{ size: 'm' }}
        isSelected={navNode.isActive}
        data-test-subj={`nav-item-${navNode.id}`}
        linkProps={{
          href,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (href) {
              navigateToUrl(href);
            }
          },
        }}
      />
    );
  }

  // We don't render anything in the UI for non root item as those register themselves on the parent (Group)
  // updating its "childrenNodes" state which are then converted to "items" for the EuiCollapsibleNavItem component.
  return null;
}

export const NavigationItem = React.memo(NavigationItemComp) as typeof NavigationItemComp;
