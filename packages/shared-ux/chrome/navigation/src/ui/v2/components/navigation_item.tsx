/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton } from '@elastic/eui';
import { ChromeNavLink } from '@kbn/core-chrome-browser';
import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useNavigation as useNavigationServices } from '../../../services';
import { useInitNavnode } from '../use_init_navnode';
import { UnRegisterFunction } from './navigation';
import { useRegisterTreeNode } from './use_register_tree_node';

interface Props {
  children?: ((deepLink?: ChromeNavLink) => ReactNode) | string;
  id?: string;
  title?: string;
  link?: string;
  // Temp to test removing nav nodes
  onRemove?: () => void;
}

function NavigationItemComp({ children, onRemove, ...rest }: Props) {
  const { navLinks$ } = useNavigationServices();
  const deepLinks = useObservable(navLinks$, []);
  const unregisterRef = useRef<UnRegisterFunction>();
  const isRegistered = useRef(false);

  const navNode = useInitNavnode(rest, { deepLinks });
  const { title, deepLink, status } = navNode;
  const isActive = status === 'active';
  const { register } = useRegisterTreeNode();

  const unregister = useCallback(() => {
    if (isRegistered.current && unregisterRef.current) {
      unregisterRef.current();
      isRegistered.current = false;
    }
  }, []);

  // Note: temporary UI. In future PR we'll have an EUI component here
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

  const renderContent = useCallback(() => {
    if (!children) {
      return wrapTextWithLink(title);
    }
    return typeof children === 'function' ? children(deepLink) : wrapTextWithLink(children);
  }, [children, deepLink, title, wrapTextWithLink]);

  const renderTempUIToTestRemoveBehavior = () => (
    <>
      {' '}
      <EuiButton size="s" onClick={() => onRemove?.()}>
        Remove
      </EuiButton>
    </>
  );



  useEffect(() => {
    if (isActive) {
      unregisterRef.current = register(navNode);
      isRegistered.current = true;
    } else {
      unregister();
    }
  }, [isActive, navNode, register, unregister]);

  useEffect(() => {
    return unregister;
  }, [unregister]);

  if (!isActive) {
    return null;
  }

  return (
    // Note: temporary UI. In future PR we'll have an EUI component here
    <li style={{ paddingLeft: '20px', marginBottom: '5px' }}>
      {renderContent()}
      {renderTempUIToTestRemoveBehavior()}
    </li>
  );
}

export const NavigationItem = React.memo(NavigationItemComp);
