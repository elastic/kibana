/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useCallback,
  ReactNode,
  useMemo,
  useContext,
  useRef,
  Children,
} from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import useObservable from 'react-use/lib/useObservable';

import { useNavigation as useNavigationServices } from '../../services';
import { RegisterFunction, UnRegisterFunction } from '../types';
import { NavigationFooter } from './navigation_footer';
import { NavigationGroup } from './navigation_group';
import { NavigationItem } from './navigation_item';
import { NavigationUI } from './navigation_ui';
import { RecentlyAccessed } from './recently_accessed';
import { PanelProvider, type ContentProvider } from './panel';

interface Context {
  register: RegisterFunction;
  unstyled: boolean;
  activeNodes: ChromeProjectNavigationNode[][];
}

const NavigationContext = createContext<Context>({
  register: () => () => {},
  unstyled: false,
  activeNodes: [],
});

interface Props {
  children: ReactNode;
  /**
   * Optional content provider for the navigation panels. Use it to render custom component
   * inside the panel when the user clicks on a navigation item.
   * If not provided the default content will be rendered.
   */
  panelContentProvider?: ContentProvider;
  /**
   * Flag to indicate if the Navigation should not be styled with EUI components.
   * If set to true, the children will be rendered as is.
   */
  unstyled?: boolean;
  dataTestSubj?: string;
}

export function Navigation({
  children,
  panelContentProvider,
  unstyled = false,
  dataTestSubj,
}: Props) {
  const { onProjectNavigationChange, activeNodes$ } = useNavigationServices();

  // We keep a reference of the order of the children that register themselves when mounting.
  // This guarantees that the navTree items sent to the Chrome service has the same order
  // that the nodes in the DOM.
  const orderChildrenRef = useRef<Record<string, number>>({});
  const idx = useRef(0);

  const activeNodes = useObservable(activeNodes$, []);
  const navigationItemsRef = useRef<Record<string, ChromeProjectNavigationNode>>({});

  const onNavigationItemsChange = useCallback(() => {
    const navigationTree = Object.values(navigationItemsRef.current).sort((a, b) => {
      const aOrder = orderChildrenRef.current[a.id];
      const bOrder = orderChildrenRef.current[b.id];
      return aOrder - bOrder;
    });

    // This will update the navigation tree in the Chrome service (calling the serverless.setNavigation())
    onProjectNavigationChange({ navigationTree });
  }, [onProjectNavigationChange]);

  const unregister = useCallback(
    (id: string) => {
      const updatedItems = { ...navigationItemsRef.current };
      delete updatedItems[id];
      navigationItemsRef.current = updatedItems;

      onNavigationItemsChange();
    },
    [onNavigationItemsChange]
  );

  const register = useCallback<RegisterFunction>(
    (navNode, order): UnRegisterFunction => {
      if (orderChildrenRef.current[navNode.id] === undefined) {
        orderChildrenRef.current[navNode.id] = order ?? idx.current++;
      }

      const updatedRef = { ...navigationItemsRef.current, [navNode.id]: navNode };
      navigationItemsRef.current = updatedRef;

      onNavigationItemsChange();

      return () => unregister(navNode.id);
    },
    [unregister, onNavigationItemsChange]
  );

  const contextValue = useMemo<Context>(
    () => ({
      register,
      unstyled,
      activeNodes,
    }),
    [register, unstyled, activeNodes]
  );

  const childrenParsed = useMemo(() => {
    let footerChildren: ReactNode;
    const bodyChildren: ReactNode[] = [];

    Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const isFooterWrapper = child.type === NavigationFooter;
      if (isFooterWrapper && footerChildren === undefined) {
        footerChildren = child.props.children;
        return;
      }

      bodyChildren.push(child);
    });

    return { body: bodyChildren, footer: footerChildren };
  }, [children]);

  return (
    <PanelProvider activeNodes={activeNodes} contentProvider={panelContentProvider}>
      <NavigationContext.Provider value={contextValue}>
        <NavigationUI
          footerChildren={childrenParsed.footer}
          unstyled={unstyled}
          dataTestSubj={dataTestSubj}
        >
          {childrenParsed.body}
        </NavigationUI>
      </NavigationContext.Provider>
    </PanelProvider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a Navigation provider');
  }
  return context;
}

Navigation.Group = NavigationGroup;
Navigation.Item = NavigationItem;
Navigation.Footer = NavigationFooter;
Navigation.RecentlyAccessed = RecentlyAccessed;
