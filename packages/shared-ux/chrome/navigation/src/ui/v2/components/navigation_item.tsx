/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';

import { NodeProps } from '../types';
import { useInitNavnode } from '../use_init_navnode';

function NavigationItemComp(node: NodeProps) {
  const { children, onRemove } = node;
  const { navNode } = useInitNavnode(node);
  const { title, deepLink } = navNode ?? {};

  // Note: temporary UI. In future PR we'll have an EUI component here
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

  const renderContent = useCallback(() => {
    if (!children) {
      return wrapTextWithLink(title);
    }

    if (typeof children === 'string') {
      return wrapTextWithLink(children);
    } else if (typeof children === 'function') {
      return children(deepLink);
    }

    return children;
  }, [children, deepLink, title, wrapTextWithLink]);

  const renderTempUIToTestRemoveBehavior = () =>
    onRemove ? (
      <>
        {' '}
        <EuiButton size="s" onClick={() => onRemove()}>
          Remove
        </EuiButton>
      </>
    ) : null;

  if (!navNode) {
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
