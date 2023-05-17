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

import { EuiButton } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';

import { useNavigation as useNavigationServices } from '../../../services';
import { useInitNavnode } from '../use_init_navnode';
import { InternalNavigationNode } from '../types';
import { useRegisterTreeNode } from './use_register_tree_node';
import type { RegisterFunction, UnRegisterFunction } from './navigation';
import { doRenderNode } from '../utils';

export const NavigationGroupContext = createContext<Context | undefined>(undefined);

interface Context {
  register: RegisterFunction;
}

interface Props {
  children: ReactNode;
  id?: string;
  title?: string;
  link?: string;
  // Temp to test removing nav nodes
  onRemove: () => void;
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

export const NavigationGroup = ({ children, id: _id, title: _title, link, onRemove }: Props) => {
  const { navLinks$ } = useNavigationServices();
  const deepLinks = useObservable(navLinks$, []);
  const unregisterRef = useRef<UnRegisterFunction>();

  const navNodes = useRef<Record<string, InternalNavigationNode>>({});
  const isRegistered = useRef(false);

  const navNode = useInitNavnode({ id: _id, title: _title, link }, { deepLinks });
  const { id, title, deepLink } = navNode;
  const { register } = useRegisterTreeNode();

  const wrapTextWithLink = useCallback(
    (text: string) =>
      deepLink ? (
        <a href={deepLink.href} target="_blank">
          {text}
        </a>
      ) : (
        text
      ),
    [deepLink]
  );

  const renderTempUIToTestRemoveBehavior = useCallback(
    () => (
      <>
        {' '}
        <EuiButton size="s" onClick={() => onRemove()}>
          Remove
        </EuiButton>
      </>
    ),
    [onRemove]
  );

  const renderContent = useCallback(() => {
    return (
      <>
        {wrapTextWithLink(title)}
        {renderTempUIToTestRemoveBehavior()}
        <ul>{children}</ul>
      </>
    );
  }, [children, renderTempUIToTestRemoveBehavior, title, wrapTextWithLink]);

  const handleRegister = useCallback<RegisterFunction>(
    (childNode) => {
      navNodes.current[childNode.id] = childNode;

      if (isRegistered.current) {
        register({
          id,
          title,
          link,
          children: Object.values(navNodes.current),
        });
      }

      // Unregister function
      return () => {
        // Remove the child from the navNodes
        const updatedItems = { ...navNodes.current };
        delete updatedItems[childNode.id];
        navNodes.current = updatedItems;

        if (isRegistered.current) {
          // Update the parent tree
          register({
            id,
            title,
            link,
            children: Object.values(navNodes.current),
          });
        }
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
    unregisterRef.current = register({
      id,
      title,
      link,
      children: Object.values(navNodes.current),
    });

    isRegistered.current = true;

    return () => {
      isRegistered.current = false;
      if (unregisterRef.current) {
        unregisterRef.current(false);
      }
    };
  }, [register, id, title, link]);

  useEffect(() => {
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current(true);
      }
    };
  }, []);

  if (deepLinks.length === 0) {
    // Don't render anyting until we at least have 1 deeplink
    return null;
  }

  if (!doRenderNode(navNode)) {
    return null;
  }

  return (
    <NavigationGroupContext.Provider value={contextValue}>
      {/* Note: temporary UI. In future PR we'll have an EUI component here */}
      <li style={{ paddingLeft: '20px', marginBottom: '15px' }}>{renderContent()}</li>
    </NavigationGroupContext.Provider>
  );
};
