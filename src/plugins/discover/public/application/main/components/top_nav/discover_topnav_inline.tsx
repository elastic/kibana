/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiHeader, EuiHeaderSection, EuiHeaderSectionItem } from '@elastic/eui';
import { TopNavMenuBadges, TopNavMenuItems } from '@kbn/navigation-plugin/public';
import { LogsExplorerTabs } from '../../../../components/logs_explorer_tabs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDiscoverTopNav } from './use_discover_topnav';
import type { DiscoverStateContainer } from '../../services/discover_state';

export const DiscoverTopNavInline = ({
  stateContainer,
  hideNavMenuItems,
}: {
  stateContainer: DiscoverStateContainer;
  hideNavMenuItems?: boolean;
}) => {
  const { customizationContext } = stateContainer;
  const services = useDiscoverServices();
  const { topNavBadges, topNavMenu } = useDiscoverTopNav({ stateContainer });

  if (
    !customizationContext.inlineTopNav.enabled ||
    customizationContext.displayMode !== 'standalone'
  ) {
    return null;
  }

  return (
    <EuiHeader css={{ boxShadow: 'none' }} data-test-subj="discoverTopNavInline">
      {customizationContext.inlineTopNav.showLogsExplorerTabs && (
        <EuiHeaderSection>
          <EuiHeaderSectionItem>
            <LogsExplorerTabs services={services} selectedTab="discover" />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      )}
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
