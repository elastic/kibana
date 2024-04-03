/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiLink } from '@elastic/eui';

export const GithubLink: React.FC<{
  assetBasePath: string;
  label: string;
  href: string;
}> = ({ assetBasePath, label, href }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type={`${assetBasePath}/github.svg`} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiLink target="_blank" href={href}>
            {label}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
