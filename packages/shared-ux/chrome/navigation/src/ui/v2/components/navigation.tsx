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
} from 'react';
import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { useNavigation as useNavigationServices } from '../../../services';
import { InternalNavigationNode } from '../types';
import { NavigationGroup } from './navigation_group';
import { NavigationItem } from './navigation_item';

export type UnRegisterFunction = () => void;

export type RegisterFunction = (navNode: InternalNavigationNode) => UnRegisterFunction;

interface Context {
  register: RegisterFunction;
}

const NavigationContext = createContext<Context>({
  register: () => () => {},
});

interface Props {
  children: ReactNode;
  onRootItemRemove?: (id: string) => void;
}

export function Navigation({ children, onRootItemRemove }: Props) {
  const { onProjectNavigationChange } = useNavigationServices();
  const [navigationItems, setNavigationItems] = useState<
    Record<string, ChromeProjectNavigationNode>
  >({});

  const register = useCallback(
    (navNode: InternalNavigationNode) => {
      setNavigationItems((prevItems) => {
        return {
          ...prevItems,
          [navNode.id]: navNode,
        };
      });

      return () => {
        if (onRootItemRemove) {
          onRootItemRemove(navNode.id);
        }
        setNavigationItems((prevItems) => {
          const updatedItems = { ...prevItems };
          delete updatedItems[navNode.id];
          return updatedItems;
        });
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
    onProjectNavigationChange({
      navigationTree: Object.values(navigationItems),
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
