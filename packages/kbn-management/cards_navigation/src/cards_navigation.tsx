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
  EuiPageSection,
  EuiPageHeader,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { CardsNavigationComponentProps, AppRegistrySections, Application, AppProps } from './types';
import { appCategories, appDefinitions, getAppIdsByCategory } from './consts';
import type { AppId } from './consts';

// Retrieve the data we need from a given app from the management app registry
const getDataFromManagementApp = (app: Application) => {
  return {
    id: app.id,
    title: app.title,
    href: app.basePath,
  };
};

// Given a category and a list of apps, build an array of apps that belong to that category
const getAppsForCategory = (category: string, filteredApps: { [key: string]: Application }) => {
  return getAppIdsByCategory(category)
    .map((appId: AppId) => {
      if (!filteredApps[appId]) {
        return null;
      }

      return {
        ...getDataFromManagementApp(filteredApps[appId]),
        ...appDefinitions[appId],
      };
    })
    .filter(Boolean) as AppProps[];
};

const getEnabledAppsByCategory = (sections: AppRegistrySections[], hideLinksTo: string[]) => {
  // Flatten all apps into a single array
  const flattenApps = flatMap(sections, (section) => section.apps)
    // Remove all apps that the consumer wants to disable.
    .filter((app) => !hideLinksTo.includes(app.id));
  // Filter out apps that are not enabled and create an object with the
  // app id as the key so we can easily do app look up by id.
  const filteredApps: { [key: string]: Application } = flattenApps.reduce(
    (obj, item: Application) => {
      return item.enabled ? { ...obj, [item.id]: item } : obj;
    },
    {}
  );

  // Build list of categories with apps that are enabled
  return [
    {
      id: appCategories.DATA,
      title: i18n.translate('management.landing.withCardNavigation.dataTitle', {
        defaultMessage: 'Data',
      }),
      apps: getAppsForCategory(appCategories.DATA, filteredApps),
    },
    {
      id: appCategories.ALERTS,
      title: i18n.translate('management.landing.withCardNavigation.alertsTitle', {
        defaultMessage: 'Alerts and insights',
      }),
      apps: getAppsForCategory(appCategories.ALERTS, filteredApps),
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
    // Filter out categories that don't have any apps since they dont need to be rendered
  ].filter((category) => category.apps.length > 0);
};

export const CardsNavigation = ({
  sections,
  appBasePath,
  onCardClick,
  hideLinksTo = [],
}: CardsNavigationComponentProps) => {
  const appsByCategory = getEnabledAppsByCategory(sections, hideLinksTo);

  return (
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
          <EuiText data-test-subj={`category-${category.id}`}>
            <h3>{category.title}</h3>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGrid columns={3}>
            {category.apps.map((app: AppProps) => (
              <EuiFlexItem key={app.id}>
                <EuiCard
                  data-test-subj={`app-card-${app.id}`}
                  layout="horizontal"
                  icon={app.icon}
                  titleSize="xs"
                  title={app.title}
                  description={app.description}
                  href={appBasePath + app.href}
                  onClick={onCardClick}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </div>
      ))}
    </EuiPageSection>
  );
};
