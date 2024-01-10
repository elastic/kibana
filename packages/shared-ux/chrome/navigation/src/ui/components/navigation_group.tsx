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
import type { NodeProps } from '../types';
import { NavigationSectionUI } from './navigation_section_ui';
import { useNavigation } from './navigation';
import { NavigationBucket, type Props as NavigationBucketProps } from './navigation_bucket';
import { generateUniqueNodeId, getChildType } from '../../utils';
import { initNavNode } from '../../navnode_utils';
import { CloudLinks } from '../../cloud_links';

/**
 * Handler to convert the JSX children of the NavigationGroup to the ChromeProjectNavigationNode
 * interface. We do that by parsing the children with the React.Children func, read their prop
 * and initiate the node objects.
 */
const jsxChildrenToNavigationNode = (
  {
    parentNodePath,
    jsxChildren,
    rootIndex,
    treeDepth,
  }: { parentNodePath: string; jsxChildren?: ReactNode; rootIndex: number; treeDepth: number },
  { cloudLinks, deepLinks }: { cloudLinks: CloudLinks; deepLinks: Record<string, ChromeNavLink> }
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
      { ...child.props, title, rootIndex, treeDepth, index, parentNodePath },
      { cloudLinks, deepLinks }
    );

    if (!childNode) return;

    const childType = getChildType(child);

    if (childType !== 'group') {
      if (childType === 'item') {
        if (child.props.children && typeof child.props.children !== 'string') {
          // Render the node item
          childNode.renderItem = () => child.props.children;
        }
        navigationNodes.push(childNode);
      } else {
        // This is a custom JSX node, render it "as is" in the nav.
        navigationNodes.push({
          id: generateUniqueNodeId(),
          title: '',
          path: '',
          renderItem: () => child,
        });
      }
      return;
    }

    if (child.props?.children) {
      navigationNodes.push({
        ...childNode,
        // Recursively add all the children of the group
        children: jsxChildrenToNavigationNode(
          {
            parentNodePath: childNode.path,
            jsxChildren: child.props.children,
            rootIndex,
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
  const { cloudLinks, deepLinks$ } = useNavigationServices();
  const { register } = useNavigation();
  const deepLinks = useObservable(deepLinks$, {});
  const { rootIndex = 0 } = props;

  const navNodeRef = useRef<ChromeProjectNavigationNode>();
  const childrenNodesRef = useRef<ChromeProjectNavigationNode[]>();

  const navNode = useMemo<ChromeProjectNavigationNode | null>(() => {
    const _navNode = initNavNode(props, { cloudLinks, deepLinks });

    if (!_navNode) return null;

    const childrenNodes = jsxChildrenToNavigationNode(
      { parentNodePath: _navNode.path, jsxChildren: props.children, rootIndex, treeDepth: 1 },
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
  }, [props, cloudLinks, deepLinks, rootIndex]);

  /** Register when mounting and whenever the internal nav node changes */
  useEffect(() => {
    if (navNode) {
      return register(navNode, rootIndex);
    }
    return undefined;
  }, [register, navNode, rootIndex]);

  if (!navNode || navNode.sideNavStatus === 'hidden') {
    return null;
  }

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
