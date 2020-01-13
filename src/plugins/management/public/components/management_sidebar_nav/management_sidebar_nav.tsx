/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  EuiIcon,
  // @ts-ignore
  EuiSideNav,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LegacySection, LegacyApp } from '../../types';
import { ManagementApp } from '../../management_app';
import { ManagementSection } from '../../management_section';

interface NavApp {
  id: string;
  name: string;
  [key: string]: unknown;
  order: number; // only needed while merging platform and legacy
}

interface NavSection extends NavApp {
  items: NavApp[];
}

interface ManagementSidebarNavProps {
  getSections: () => ManagementSection[];
  legacySections: LegacySection[];
  selectedId: string;
}

interface ManagementSidebarNavState {
  isSideNavOpenOnMobile: boolean;
}

const managementSectionOrAppToNav = (appOrSection: ManagementApp | ManagementSection) => ({
  id: appOrSection.id,
  name: appOrSection.title,
  'data-test-subj': appOrSection.id,
  order: appOrSection.order,
});

const managementSectionToNavSection = (section: ManagementSection) => {
  const iconType = section.euiIconType
    ? section.euiIconType
    : section.icon
    ? section.icon
    : 'empty';

  return {
    icon: <EuiIcon type={iconType} size="m" />,
    ...managementSectionOrAppToNav(section),
  };
};

const managementAppToNavItem = (selectedId?: string, parentId?: string) => (
  app: ManagementApp
) => ({
  isSelected: selectedId === app.id,
  href: `#/management/${parentId}/${app.id}`,
  ...managementSectionOrAppToNav(app),
});

const legacySectionToNavSection = (section: LegacySection) => ({
  name: section.display,
  id: section.id,
  icon: section.icon ? <EuiIcon type={section.icon} /> : null,
  items: [],
  'data-test-subj': section.id,
  // @ts-ignore
  order: section.order,
});

const legacyAppToNavItem = (app: LegacyApp, selectedId: string) => ({
  isSelected: selectedId === app.id,
  name: app.display,
  id: app.id,
  href: app.url,
  'data-test-subj': app.id,
  // @ts-ignore
  order: app.order,
});

const sectionVisible = (section: LegacySection | LegacyApp) => !section.disabled && section.visible;

const sideNavItems = (sections: ManagementSection[], selectedId: string) =>
  sections.map(section => ({
    items: section.getAppsEnabled().map(managementAppToNavItem(selectedId, section.id)),
    ...managementSectionToNavSection(section),
  }));

const findOrAddSection = (navItems: NavSection[], legacySection: LegacySection): NavSection => {
  const foundSection = navItems.find(sec => sec.id === legacySection.id);

  if (foundSection) {
    return foundSection;
  } else {
    const newSection = legacySectionToNavSection(legacySection);
    navItems.push(newSection);
    navItems.sort((a: NavSection, b: NavSection) => a.order - b.order); // only needed while merging platform and legacy
    return newSection;
  }
};

export const mergeLegacyItems = (
  navItems: NavSection[],
  legacySections: LegacySection[],
  selectedId: string
) => {
  const filteredLegacySections = legacySections
    .filter(sectionVisible)
    .filter(section => section.visibleItems.length);

  filteredLegacySections.forEach(legacySection => {
    const section = findOrAddSection(navItems, legacySection);
    legacySection.visibleItems.forEach(app => {
      section.items.push(legacyAppToNavItem(app, selectedId));
      return section.items.sort((a, b) => a.order - b.order);
    });
  });

  return navItems;
};

const sectionsToItems = (
  sections: ManagementSection[],
  legacySections: LegacySection[],
  selectedId: string
) => {
  const navItems = sideNavItems(sections, selectedId);
  return mergeLegacyItems(navItems, legacySections, selectedId);
};

export class ManagementSidebarNav extends React.Component<
  ManagementSidebarNavProps,
  ManagementSidebarNavState
> {
  constructor(props: ManagementSidebarNavProps) {
    super(props);
    this.state = {
      isSideNavOpenOnMobile: false,
    };
  }

  public render() {
    const HEADER_ID = 'management-nav-header';

    return (
      <>
        <EuiScreenReaderOnly>
          <h2 id={HEADER_ID}>
            {i18n.translate('management.nav.label', {
              defaultMessage: 'Management',
            })}
          </h2>
        </EuiScreenReaderOnly>
        <EuiSideNav
          aria-labelledby={HEADER_ID}
          mobileTitle={this.renderMobileTitle()}
          isOpenOnMobile={this.state.isSideNavOpenOnMobile}
          toggleOpenOnMobile={this.toggleOpenOnMobile}
          items={sectionsToItems(
            this.props.getSections(),
            this.props.legacySections,
            this.props.selectedId
          )}
          className="mgtSideBarNav"
        />
      </>
    );
  }

  private renderMobileTitle() {
    return <FormattedMessage id="management.nav.menu" defaultMessage="Management menu" />;
  }

  private toggleOpenOnMobile = () => {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
  };
}
