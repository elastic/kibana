/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { NavigateToUrlFn } from '../../../types/internal';

interface Props {
  title: string;
  href: string;
  navigateToUrl: NavigateToUrlFn;
  iconType?: string;
}

export const GroupAsLink = ({ title, href, navigateToUrl, iconType }: Props) => {
  const groupID = useGeneratedHtmlId();
  const titleID = `${groupID}__title`;
  const TitleElement = 'h3';

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      {iconType && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiLink
          color="text"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToUrl(href);
          }}
          href={href}
        >
          <EuiTitle size="xxs">
            <TitleElement id={titleID} className="euiCollapsibleNavGroup__title">
              {title}
            </TitleElement>
          </EuiTitle>
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
