/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useCallback, useMemo, useContext } from 'react';

import { EuiButton } from '@elastic/eui';
import { useInitNavnode } from '../use_init_navnode';
import { NodeProps, RegisterFunction } from '../types';

export const NavigationGroupContext = createContext<Context | undefined>(undefined);

interface Context {
  register: RegisterFunction;
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

function NavigationGroupComp(node: NodeProps) {
  const { children, onRemove } = node;
  const { navNode, registerChildNode } = useInitNavnode(node);
  const { title, deepLink } = navNode ?? {};

  const wrapTextWithLink = useCallback(
    (text?: string) =>
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
    () =>
      onRemove ? (
        <>
          {' '}
          <EuiButton size="s" onClick={() => onRemove()}>
            Remove
          </EuiButton>
        </>
      ) : null,
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

  const contextValue = useMemo(() => {
    return {
      register: registerChildNode,
    };
  }, [registerChildNode]);

  if (!navNode) {
    return null;
  }

  return (
    <NavigationGroupContext.Provider value={contextValue}>
      {/* Note: temporary UI. In future PR we'll have an EUI component here */}
      <li style={{ paddingLeft: '20px', marginBottom: '15px' }}>{renderContent()}</li>
    </NavigationGroupContext.Provider>
  );
}

export const NavigationGroup = React.memo(NavigationGroupComp);
