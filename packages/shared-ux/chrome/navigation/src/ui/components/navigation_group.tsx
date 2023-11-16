/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useMemo,
  useContext,
  Children,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { AppDeepLinkId, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { useNavigation as useNavigationServices } from '../../services';
import type { NodeProps, NodePropsEnhanced, RegisterFunction } from '../types';
import { NavigationSectionUI } from './navigation_section_ui';
import { useNavigation } from './navigation';
import { NavigationBucket, type Props as NavigationBucketProps } from './navigation_bucket';
import { getNavigationNodeId, nodePathToString } from '../../utils';
import { initNavNode } from '../../navnode_utils';

interface Context {
  register: RegisterFunction;
}

export const NavigationGroupContext = createContext<Context | undefined>(undefined);

export function useNavigationGroup<T extends boolean = true>(
  throwIfNotFound: T = true as T
): T extends true ? Context : Context | undefined {
  const context = useContext(NavigationGroupContext);
  if (!context && throwIfNotFound) {
    throw new Error('useNavigationGroup must be used within a NavigationGroup provider');
  }
  return context as T extends true ? Context : Context | undefined;
}

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
  // console.log('Render group...');

  const debug = useRef({ ...props });
  const navNode = useMemo<ChromeProjectNavigationNode | null>(() => {
    console.log('Rebuilding group Nav Node.......', props.id);

    Object.entries(debug.current).forEach(([key, value]) => {
      console.log(key, value !== props[key]);
    });
    debug.current = { ...props };
    console.log('------------------------');

    const getNodeEnhanced = (_props: Props<LinkId, Id, ChildrenId> = props) => {
      const { children, defaultIsCollapsed, ...rest } = _props;

      const id = getNavigationNodeId(rest) as Id;
      const nodeEnhanced: Omit<NodePropsEnhanced<LinkId, Id, ChildrenId>, 'children'> = {
        ...rest,
        id,
        isActive: defaultIsCollapsed !== undefined ? defaultIsCollapsed === false : undefined,
        isGroup: true,
      };

      return nodeEnhanced;
    };

    const enhancedNode = getNodeEnhanced();
    const path = [enhancedNode.id as string];

    const _navNode = initNavNode(enhancedNode, { cloudLinks, deepLinks });
    if (!_navNode) return null;

    const childrenToNavigationNode = (
      parentNodePath: string[],
      _children?: ReactNode
    ): ChromeProjectNavigationNode[] | undefined => {
      if (!_children) return undefined;

      const navigationNodesFromChildren: ChromeProjectNavigationNode[] = [];

      Children.forEach(_children, (child) => {
        if (!React.isValidElement(child)) {
          return;
        }
        const title =
          typeof child.props.children === 'string' ? child.props.children : child.props.title;
        const childNode = initNavNode(
          { ...getNodeEnhanced({ ...child.props, title }), parentNodePath },
          { cloudLinks, deepLinks }
        );

        if (!childNode) return;

        const isNavigationGroup = child.type === NavigationGroup;

        if (!isNavigationGroup) {
          // TODO: handle possible JSX children of NavigationItem to renderItem() func
          return navigationNodesFromChildren.push(childNode);
        }

        if (child.props?.children) {
          // const childPath = [...parentNodePath, childNode.id as Id]; // Arrived here
          return navigationNodesFromChildren.push({
            ...childNode,
            // path: childPath,
            children: childrenToNavigationNode(childNode.path, child.props.children),
          });
        }

        navigationNodesFromChildren.push(childNode);
      });

      return navigationNodesFromChildren.length > 0 ? navigationNodesFromChildren : undefined;
    };

    const subNavigationNodes = childrenToNavigationNode(path, props.children);

    return {
      ..._navNode,
      path,
      children: subNavigationNodes,
    };
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
  const isRootLevel = path && path.length === 1;

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
