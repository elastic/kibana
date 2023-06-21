/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { flatMap } from 'lodash';
import {
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { appCategories, appDefinitions, getAppIdsByCategory } from './consts';

interface ManagementLandingPageProps {
  sections: any[];
  appBasePath: string;
}

const getDataFromManagementApp = (section: any) => {
  return {
    id: section.id,
    title: section.title,
    href: section.basePath,
  };
};

const getAppsForCategory = (category: string, filteredApps: { [key: string]: any }) => {
  return getAppIdsByCategory(category)
    .map((appId: string) => {
      if (!filteredApps[appId]) {
        return null;
      }

      return {
        ...getDataFromManagementApp(filteredApps[appId]),
        ...appDefinitions[appId],
      };
    })
    .filter(Boolean);
};

const getEnabledAppsByCategory = (sections: any[]) => {
  // Flatten all apps into a single array
  const flattenApps = flatMap(sections, (section) => section.apps);
  // Filter out apps that are not enabled and create an object with the
  // app id as the key so we can easily do app look up by id.
  const filteredApps: { [key: string]: any } = flattenApps.reduce((obj, item: any) => {
    return item.enabled ? { ...obj, [item.id]: item } : obj;
  }, {});

  return [
    {
      id: appCategories.DATA,
      title: i18n.translate('management.landing.withCardNavigation.dataTitle', {
        defaultMessage: 'Data',
      }),
      apps: getAppsForCategory(appCategories.DATA, filteredApps),
    },
    {
      id: appCategories.CONTENT,
      title: i18n.translate('management.landing.withCardNavigation.contentTitle', {
        defaultMessage: 'Content',
      }),
      apps: getAppsForCategory(appCategories.CONTENT, filteredApps),
    },
    {
      id: appCategories.OTHER,
      title: i18n.translate('management.landing.withCardNavigation.otherTitle', {
        defaultMessage: 'Other',
      }),
      apps: getAppsForCategory(appCategories.OTHER, filteredApps),
    },
  ].filter((category) => category.apps.length > 0);
};

export const CardsNavigation = ({ sections, appBasePath }: ManagementLandingPageProps) => {
  const appsByCategory = getEnabledAppsByCategory(sections);

  return (
    <EuiPageBody restrictWidth={true}>
      <EuiPageSection color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18n.translate('management.landing.withCardNavigation.pageTitle', {
            defaultMessage: 'Management',
          })}
          description={i18n.translate('management.landing.withCardNavigation.pageDescription', {
            defaultMessage: 'Manage your indices, data views, saved objects, settings, and more.',
          })}
        />

        {appsByCategory.map((category, index) => (
          <div key={category.id}>
            {index === 0 ? (
              <EuiSpacer size="l" />
            ) : (
              <>
                <EuiSpacer size="s" />
                <EuiHorizontalRule />
              </>
            )}
            <EuiText>
              <h3>{category.title}</h3>
            </EuiText>
            <EuiSpacer size="l" />
            <EuiFlexGrid columns={3}>
              {category.apps.map((app) => (
                <EuiFlexItem key={app!.id}>
                  <EuiCard
                    layout="horizontal"
                    icon={app!.icon}
                    titleSize="xs"
                    title={app!.title}
                    description={app!.description}
                    href={appBasePath + app!.href}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          </div>
        ))}
      </EuiPageSection>
    </EuiPageBody>
  );
};
