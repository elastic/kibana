/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useEffect, useMemo, useRef } from 'react';
import type { AppDeepLinkId, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { EuiCollapsibleNavItem } from '@elastic/eui';
import classNames from 'classnames';
import deepEqual from 'react-fast-compare';
import useObservable from 'react-use/lib/useObservable';

import { useNavigation as useNavigationServices } from '../../services';
import type { NodeProps } from '../types';
import { useNavigation } from './navigation';
import { isActiveFromUrl } from '../../utils';
import { initNavNode } from '../../navnode_utils';

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
  const { cloudLinks, navigateToUrl, deepLinks$ } = useNavigationServices();
  const { unstyled: unstyledFromContext, register, activeNodes } = useNavigation();
  const deepLinks = useObservable(deepLinks$, {});
  const navNodeRef = useRef<ChromeProjectNavigationNode>();
  const { rootIndex, appendHorizontalRule } = props;

  const { children, node } = useMemo(() => {
    const { children: _children, ...rest } = props;

    if (typeof _children === 'string') {
      rest.title = rest.title ?? _children;
    }

    return {
      children: _children,
      node: rest,
    };
  }, [props]);
  const unstyled = props.unstyled ?? unstyledFromContext;

  const navNode = useMemo(() => {
    const _navNode = initNavNode(node, { cloudLinks, deepLinks });
    if (!_navNode) return null;

    const hasChanged = deepEqual(_navNode, navNodeRef.current) === false;
    if (hasChanged) {
      navNodeRef.current = _navNode;
    }

    if (navNodeRef.current === undefined) {
      // Adding this check for TS purpose, it should never be undefined.
      throw new Error('Navnode ref is undefined.');
    }

    return navNodeRef.current;
  }, [node, cloudLinks, deepLinks]);

  if (navNode && appendHorizontalRule) {
    throw new Error(
      `[Chrome navigation] Error in node [${navNode.id}]. "appendHorizontalRule" can only be added for group with children.`
    );
  }

  useEffect(() => {
    if (navNode) {
      return register(navNode, rootIndex);
    }
    return undefined;
  }, [register, navNode, rootIndex]);

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

  const isActive = isActiveFromUrl(navNode.path, activeNodes);

  const { href } = navNode;
  const dataTestSubj = classNames(`nav-item`, {
    [`nav-item-deepLinkId-${navNode.deepLink?.id}`]: !!navNode.deepLink,
    [`nav-item-isActive`]: isActive,
  });

  return (
    <EuiCollapsibleNavItem
      id={navNode.id}
      title={navNode.title}
      icon={navNode.icon}
      iconProps={{ size: 'm' }}
      isSelected={isActive}
      data-test-subj={dataTestSubj}
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

export const NavigationItem = React.memo(NavigationItemComp) as typeof NavigationItemComp;
