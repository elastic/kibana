/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { css } from '@emotion/react';
import { LinksSection } from './links_section';
import { CodeownersSection } from './codeowners_section';
import { Header } from './header';

interface Props {
  codeowners: string[];
  path: string;
  fullPath?: string;
}

export const flyoutOptions: OverlayFlyoutOpenOptions = {
  size: 's',
  'data-test-subj': 'inspectComponentFlyout',
};

export const InspectFlyout = ({ codeowners, fullPath, path }: Props) => {
  const { euiTheme } = useEuiTheme();

  const flyoutCss = css`
    padding: ${euiTheme.size.l};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" css={flyoutCss}>
      <Header />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="l">
          <CodeownersSection codeowners={codeowners} />
          <LinksSection path={path} fullPath={fullPath} />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
