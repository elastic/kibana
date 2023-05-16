/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  ReactNode,
  createContext,
  useCallback,
  useMemo,
  useContext,
  useRef,
  useEffect,
} from 'react';

import type { RegisterFunction } from './navigation';
import type { NavigationNode } from '../types';
import { useInitNavnode } from '../use_init_navnode';
import { useRegisterTreeNode } from './use_register_tree_node';

export const NavigationGroupContext = createContext<Context | undefined>(undefined);

interface Context {
  register: RegisterFunction;
}

interface Props {
  children: ReactNode;
  id?: string;
  title?: string;
  link?: string;
}

export function useNavigationGroup<T extends boolean = true>(
  throwIfNotFound: T = true as T
): T extends true ? Context : Context | undefined {
  const context = useContext(NavigationGroupContext);
  if (!context && throwIfNotFound) {
    throw new Error('useNavigationGroup must be used within a NavigationGroup provider');
  }
  return context as T extends true ? Context : Context | undefined;
}

export const NavigationGroup = ({ children, id: _id, title: _title, link }: Props) => {
  const navNodes = useRef<Record<string, NavigationNode>>({});

  const { id, title } = useInitNavnode({ id: _id, title: _title, link });
  const { register } = useRegisterTreeNode();

  const handleRegister = useCallback<RegisterFunction>(
    (navNode) => {
      navNodes.current[navNode.id] = navNode;

      register({
        id,
        title,
        link,
        items: Object.values(navNodes.current),
      });

      // Unregister function
      return () => {
        // Remove the child from the navNodes
        const updatedItems = { ...navNodes.current };
        delete updatedItems[navNode.id];
        navNodes.current = updatedItems;

        // Update the parent tree
        register({
          id,
          title,
          link,
          items: Object.values(navNodes.current),
        });
      };
    },
    [register, id, title, link]
  );

  const contextValue = useMemo(() => {
    return {
      register: handleRegister,
    };
  }, [handleRegister]);

  useEffect(() => {
    register({
      id,
      title,
      link,
      items: Object.values(navNodes.current),
    });
  }, [register, id, title, link]);

  return (
    <NavigationGroupContext.Provider value={contextValue}>
      <li>
        {title}
        <ul>{children}</ul>
      </li>
    </NavigationGroupContext.Provider>
  );
};
