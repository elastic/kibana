/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeader, EuiHeaderSection, EuiHeaderSectionItem, useEuiTheme } from '@elastic/eui';
import { TopNavMenuBadges, TopNavMenuItems } from '@kbn/navigation-plugin/public';
import { useDiscoverTopNav } from './use_discover_topnav';
import type { DiscoverStateContainer } from '../../state_management/discover_state';

export const DiscoverTopNavInline = ({
  stateContainer,
  hideNavMenuItems,
}: {
  stateContainer: DiscoverStateContainer;
  hideNavMenuItems?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const { customizationContext } = stateContainer;
  const { topNavBadges, topNavMenu } = useDiscoverTopNav({ stateContainer });

  if (
    !customizationContext.inlineTopNav.enabled ||
    customizationContext.displayMode !== 'standalone'
  ) {
    return null;
  }

  return (
    <EuiHeader
      css={{ boxShadow: 'none', backgroundColor: euiTheme.colors.body }}
      data-test-subj="discoverTopNavInline"
    >
      {!hideNavMenuItems && (
        <EuiHeaderSection side="right" data-test-subj="topNavMenuItems">
          <EuiHeaderSectionItem>
            <TopNavMenuBadges badges={topNavBadges} />
          </EuiHeaderSectionItem>
          <EuiHeaderSectionItem>
            <TopNavMenuItems config={topNavMenu} />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      )}
    </EuiHeader>
  );
};
