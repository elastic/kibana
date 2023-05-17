/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton } from '@elastic/eui';
import { ChromeNavLink } from '@kbn/core-chrome-browser';
import React, { ReactNode, useCallback, useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useNavigation as useNavigationServices } from '../../../services';
import { useInitNavnode } from '../use_init_navnode';
import { useRegisterTreeNode } from './use_register_tree_node';

interface Props {
  children?: ((deepLink?: ChromeNavLink) => ReactNode) | string;
  id?: string;
  title?: string;
  link?: string;
  // Temp to test removing nav nodes
  onRemove: () => void;
}

export const NavigationItem = ({ children, id: _id, title: _title, link, onRemove }: Props) => {
  const { navLinks$ } = useNavigationServices();
  const deepLinks = useObservable(navLinks$, []);

  const { id, title, deepLink } = useInitNavnode({ id: _id, title: _title, link }, { deepLinks });
  const { register } = useRegisterTreeNode();

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
      <EuiButton size="s" onClick={() => onRemove()}>
        Remove
      </EuiButton>
    </>
  );

  useEffect(() => {
    const unRegister = register({ id, title, link });

    return unRegister;
  }, [register, id, title, link]);

  if (deepLinks.length === 0) {
    // Don't render anyting until we at least have 1 deeplink in the Observable
    return null;
  }

  if (link && !deepLink) {
    // If a link is provided, but no deepLink is found, don't render anything
    return null;
  }

  return (
    <li style={{ paddingLeft: '20px', marginBottom: '5px' }}>
      {renderContent()}
      {renderTempUIToTestRemoveBehavior()}
    </li>
  );
};
