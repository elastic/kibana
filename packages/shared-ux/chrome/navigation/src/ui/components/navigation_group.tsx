/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, Children, ReactNode, useEffect, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import deepEqual from 'react-fast-compare';
import type {
  AppDeepLinkId,
  ChromeProjectNavigationNode,
  ChromeNavLink,
} from '@kbn/core-chrome-browser';

import { useNavigation as useNavigationServices } from '../../services';
import type { NodeProps, NodePropsEnhanced } from '../types';
import { NavigationSectionUI } from './navigation_section_ui';
import { useNavigation } from './navigation';
import { NavigationBucket, type Props as NavigationBucketProps } from './navigation_bucket';
import { getNavigationNodeId } from '../../utils';
import { initNavNode } from '../../navnode_utils';
import { CloudLinks } from '../../cloud_links';

function getEnhancedProps<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(
  props: Props<LinkId, Id, ChildrenId>,
  { treeDepth, index }: { treeDepth: number; index?: number }
) {
  const { children, defaultIsCollapsed, ...rest } = props;
  const id = getNavigationNodeId(rest, () => `node-${treeDepth}-${index ?? 'root'}`) as Id;

  const nodeEnhanced: Omit<NodePropsEnhanced<LinkId, Id, ChildrenId>, 'children' | 'id'> & {
    id: Id;
  } = {
    ...rest,
    id,
    isActive: defaultIsCollapsed !== undefined ? defaultIsCollapsed === false : undefined,
    isGroup: true,
  };

  return nodeEnhanced;
}

/**
 * Handler to convert the JSX children of the NavigationGroup to the ChromeProjectNavigationNode
 * interface. We do that by parsing the children with the React.Children func, read their prop
 * and initiate the node objects.
 */
const jsxChildrenToNavigationNode = (
  {
    parentNodePath,
    jsxChildren,
    treeDepth,
  }: { parentNodePath: string; jsxChildren?: ReactNode; treeDepth: number },
  { cloudLinks, deepLinks }: { cloudLinks: CloudLinks; deepLinks: Readonly<ChromeNavLink[]> }
): ChromeProjectNavigationNode[] | undefined => {
  if (!jsxChildren) return undefined;

  const navigationNodes: ChromeProjectNavigationNode[] = [];

  Children.forEach(jsxChildren, (child, index) => {
    if (!React.isValidElement(child)) {
      return;
    }
    const title =
      typeof child.props.children === 'string' ? child.props.children : child.props.title;
    const childNode = initNavNode(
      { ...getEnhancedProps({ ...child.props, title }, { treeDepth, index }), parentNodePath },
      { cloudLinks, deepLinks }
    );

    if (!childNode) return;

    const isNavigationGroup = child.type === NavigationGroup;

    if (!isNavigationGroup) {
      // TODO: handle possible JSX children of NavigationItem to renderItem() func
      navigationNodes.push(childNode);
      return;
    }

    if (child.props?.children) {
      navigationNodes.push({
        ...childNode,
        children: jsxChildrenToNavigationNode(
          {
            parentNodePath: childNode.path,
            jsxChildren: child.props.children,
            treeDepth: treeDepth + 1,
          },
          { cloudLinks, deepLinks }
        ),
      });
      return;
    }

    navigationNodes.push(childNode);
  });

  return navigationNodes.length > 0 ? navigationNodes : undefined;
};

export interface Props<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends NodeProps<LinkId, Id, ChildrenId> {
  unstyled?: boolean;
}

function NavigationGroupInternalComp<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(props: Props<LinkId, Id, ChildrenId>) {
  const { cloudLinks, navLinks$ } = useNavigationServices();
  const { register } = useNavigation();
  const deepLinks = useObservable(navLinks$, []);

  const navNodeRef = useRef<ChromeProjectNavigationNode>();
  const childrenNodesRef = useRef<ChromeProjectNavigationNode[]>();

  const navNode = useMemo<ChromeProjectNavigationNode | null>(() => {
    const enhancedProps = getEnhancedProps(props, { treeDepth: 0 });
    const _navNode = initNavNode(enhancedProps, { cloudLinks, deepLinks });

    if (!_navNode) return null;

    const childrenNodes = jsxChildrenToNavigationNode(
      { parentNodePath: _navNode.path, jsxChildren: props.children, treeDepth: 0 },
      { cloudLinks, deepLinks }
    );

    const childrenChanged = deepEqual(childrenNodes, childrenNodesRef.current) === false;
    if (childrenChanged) {
      childrenNodesRef.current = childrenNodes;
    }

    const nextValue = {
      ..._navNode,
      children: childrenNodesRef.current,
    };

    const hasChanged = deepEqual(nextValue, navNodeRef.current) === false;
    if (hasChanged) {
      navNodeRef.current = nextValue;
    }

    if (navNodeRef.current === undefined) {
      // Adding this check for TS purpose, it should never be undefined.
      throw new Error('Navnode ref is undefined.');
    }

    return navNodeRef.current;
  }, [props, cloudLinks, deepLinks]);

  /** Register when mounting and whenever the internal nav node changes */
  useEffect(() => {
    if (navNode) {
      register(navNode);
    }
    return undefined;
  }, [register, navNode]);

  if (!navNode || navNode.sideNavStatus === 'hidden') {
    return null;
  }

  const { path } = navNode;

  // We will only render the <NavigationSectionUI /> component for root groups. The nested group
  // are handled by the EuiCollapsibleNavItem component through its "items" prop.
  const pathToArray = path.split('.');
  const isRootLevel = pathToArray.length === 1;

  if (!isRootLevel) return null;
  return <NavigationSectionUI navNode={navNode} />;
}

function NavigationGroupComp<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(props: Props<LinkId, Id, ChildrenId> & NavigationBucketProps) {
  if (props.preset) {
    return (
      <NavigationBucket
        preset={props.preset}
        nodeDefinition={props.nodeDefinition}
        defaultIsCollapsed={props.defaultIsCollapsed}
      />
    );
  }

  const { preset, nodeDefinition, ...rest } = props;
  return <NavigationGroupInternalComp {...rest} />;
}

export const NavigationGroup = React.memo(NavigationGroupComp) as typeof NavigationGroupComp;
