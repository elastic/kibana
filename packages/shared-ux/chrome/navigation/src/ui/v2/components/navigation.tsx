/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
  useContext,
  useRef,
} from 'react';

import { useNavigation as useNavigationServices } from '../../../services';
import { InternalNavigationNode, RegisterFunction } from '../types';
import { NavigationGroup } from './navigation_group';
import { NavigationItem } from './navigation_item';

interface Context {
  register: RegisterFunction;
}

const NavigationContext = createContext<Context>({
  register: () => ({
    unregister: () => {},
    path: [],
  }),
});

interface Props {
  children: ReactNode;
  onRootItemRemove?: (id: string) => void;
}

export function Navigation({ children, onRootItemRemove }: Props) {
  const { onProjectNavigationChange } = useNavigationServices();

  // We keep a reference of the order of the children that register themselves when mounting.
  // This guarantees that the navTree items sent to the Chrome service has the same order
  // that the nodes in the DOM.
  const orderChildrenRef = useRef<Record<string, number>>({});
  const idx = useRef(0);

  const [navigationItems, setNavigationItems] = useState<Record<string, InternalNavigationNode>>(
    {}
  );

  const register = useCallback(
    (navNode: InternalNavigationNode) => {
      orderChildrenRef.current[navNode.id] = idx.current++;

      setNavigationItems((prevItems) => {
        return {
          ...prevItems,
          [navNode.id]: navNode,
        };
      });

      return {
        unregister: () => {
          if (onRootItemRemove) {
            onRootItemRemove(navNode.id);
          }

          setNavigationItems((prevItems) => {
            const updatedItems = { ...prevItems };
            delete updatedItems[navNode.id];
            return updatedItems;
          });
        },
        path: [],
      };
    },
    [onRootItemRemove]
  );

  const contextValue = useMemo<Context>(
    () => ({
      register,
    }),
    [register]
  );

  useEffect(() => {
    // Send the navigation tree to the Chrome service
    onProjectNavigationChange({
      navigationTree: Object.values(navigationItems).sort((a, b) => {
        const aOrder = orderChildrenRef.current[a.id];
        const bOrder = orderChildrenRef.current[b.id];
        return aOrder - bOrder;
      }),
    });
  }, [navigationItems, onProjectNavigationChange]);

  return (
    <NavigationContext.Provider value={contextValue}>
      <ul>{children}</ul>
    </NavigationContext.Provider>
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
