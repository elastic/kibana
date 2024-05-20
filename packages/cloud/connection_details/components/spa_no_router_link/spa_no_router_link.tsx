/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiLink } from '@elastic/eui';

const hasActiveModifierKey = (event: React.MouseEvent): boolean => {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
};

export interface SpaNoRouterLinkProps {
  url: string;
  go?: (url: string) => void;
  onClick?: React.MouseEventHandler;
  'data-test-subj'?: string;
}

export const SpaNoRouterLink: React.FC<SpaNoRouterLinkProps> = ({
  url,
  go,
  onClick,
  children,
  ...rest
}) => {
  return (
    /* eslint-disable-next-line @elastic/eui/href-or-on-click */
    <EuiLink
      {...rest}
      href={url}
      onClick={(e: React.MouseEvent) => {
        if (!go) return;

        if (!hasActiveModifierKey(e)) {
          e.preventDefault();
          go(url);
        }

        onClick?.(e);
      }}
    >
      {children}
    </EuiLink>
  );
};
