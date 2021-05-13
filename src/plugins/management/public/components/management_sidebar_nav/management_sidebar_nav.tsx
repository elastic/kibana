/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';

import {
  EuiIcon,
  EuiSideNav,
  EuiSideNavItemType,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { AppMountParameters } from 'kibana/public';
import { ManagementApp, ManagementSection } from '../../utils';

import { ManagementItem } from '../../utils/management_item';
import { reactRouterNavigate } from '../../../../kibana_react/public';

interface ManagementSidebarNavProps {
  sections: ManagementSection[];
  history: AppMountParameters['history'];
  selectedId: string;
  navId?: string;
}

const navMenuLabel = i18n.translate('management.nav.menu', {
  defaultMessage: 'Management menu',
});

/** @internal **/
export const ManagementSidebarNav = ({
  navId,
  selectedId,
  sections,
  history,
}: ManagementSidebarNavProps) => {
  const [isSideNavOpenOnMobile, setIsSideNavOpenOnMobile] = useState(false);
  const toggleOpenOnMobile = () => setIsSideNavOpenOnMobile(!isSideNavOpenOnMobile);

  const sectionsToNavItems = (managementSections: ManagementSection[]) => {
    const sortedManagementSections = sortBy(managementSections, 'order');

    return sortedManagementSections.reduce<Array<EuiSideNavItemType<any>>>((acc, section) => {
      const apps = sortBy(section.getAppsEnabled(), 'order');

      if (apps.length) {
        acc.push({
          ...createNavItem(section, {
            items: appsToNavItems(apps),
          }),
        });
      }

      return acc;
    }, []);
  };

  const appsToNavItems = (managementApps: ManagementApp[]) =>
    managementApps.map((app) => ({
      ...createNavItem(app, {
        ...reactRouterNavigate(history, app.basePath),
      }),
    }));

  interface TooltipWrapperProps {
    text: string;
    tip?: string;
  }

  const TooltipWrapper = ({ text, tip }: TooltipWrapperProps) => (
    <EuiToolTip content={tip} position="right">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>{text}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIcon color="subdued" size="s" type="questionInCircle" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );

  const createNavItem = <T extends ManagementItem>(
    item: T,
    customParams: Partial<EuiSideNavItemType<any>> = {}
  ) => {
    const iconType = item.euiIconType || item.icon;

    return {
      id: item.id,
      name: item.tip ? <TooltipWrapper text={item.title} tip={item.tip} /> : item.title,
      isSelected: item.id === selectedId,
      icon: iconType ? <EuiIcon type={iconType} size="m" /> : undefined,
      'data-test-subj': item.id,
      ...customParams,
    };
  };

  return (
    <>
      <EuiSideNav
        aria-labelledby={navId}
        mobileTitle={navMenuLabel}
        toggleOpenOnMobile={toggleOpenOnMobile}
        isOpenOnMobile={isSideNavOpenOnMobile}
        items={sectionsToNavItems(sections)}
        data-test-subj="mgtSideBarNav"
      />
    </>
  );
};
