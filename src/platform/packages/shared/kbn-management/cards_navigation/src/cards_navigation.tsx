/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
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
  EuiIcon,
} from '@elastic/eui';
import {
  CardsNavigationComponentProps,
  AppRegistrySections,
  Application,
  AppProps,
  AppId,
  AppDefinition,
  CardNavExtensionDefinition,
} from './types';
import { appCategories, appDefinitions as defaultCardNavigationDefinitions } from './consts';

type AggregatedCardNavDefinitions =
  | NonNullable<CardsNavigationComponentProps['extendedCardNavigationDefinitions']>
  | Record<AppId, AppDefinition>;

// Retrieve the data we need from a given app from the management app registry
const getDataFromManagementApp = (app: Application) => {
  return {
    id: app.id,
    title: app.title,
    href: app.basePath,
  };
};

// Compose a list of app ids that belong to a given category
export const getAppIdsByCategory = (
  category: string,
  appDefinitions: AggregatedCardNavDefinitions
) => {
  const appKeys = Object.keys(appDefinitions) as AppId[];
  return appKeys.filter((appId: AppId) => {
    return appDefinitions[appId].category === category;
  });
};

// Given a category and a list of apps, build an array of apps that belong to that category
const getAppsForCategoryFactory =
  (appDefinitions: AggregatedCardNavDefinitions) =>
  (category: string, filteredApps: { [key: string]: Application }) => {
    return getAppIdsByCategory(category, appDefinitions)
      .map((appId: AppId) => {
        if ((appDefinitions[appId] as CardNavExtensionDefinition).skipValidation) {
          return {
            id: appId,
            ...appDefinitions[appId],
          };
        }

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

const getEnabledAppsByCategory = (
  sections: AppRegistrySections[],
  cardNavigationDefintions: AggregatedCardNavDefinitions,
  hideLinksTo: string[]
) => {
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

  const getAppsForCategory = getAppsForCategoryFactory(cardNavigationDefintions);

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
      id: appCategories.ACCESS,
      title: i18n.translate('management.landing.withCardNavigation.accessTitle', {
        defaultMessage: 'Access',
      }),
      apps: getAppsForCategory(appCategories.ACCESS, filteredApps),
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
  extendedCardNavigationDefinitions = {},
}: CardsNavigationComponentProps) => {
  const cardNavigationDefintions = useMemo<AggregatedCardNavDefinitions>(
    () => ({
      ...defaultCardNavigationDefinitions,
      ...extendedCardNavigationDefinitions,
    }),
    [extendedCardNavigationDefinitions]
  );

  const appsByCategory = getEnabledAppsByCategory(sections, cardNavigationDefintions, hideLinksTo);

  return (
    <EuiPageSection color="transparent" paddingSize="none">
      <EuiPageHeader
        bottomBorder
        pageTitle={i18n.translate('management.landing.withCardNavigation.pageTitle', {
          defaultMessage: 'Management',
        })}
        description={i18n.translate('management.landing.withCardNavigation.pageDescription', {
          defaultMessage:
            'Manage data and indices, oversee rules and connectors, organize saved objects and files, and create API keys in a central location.',
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
                  icon={<EuiIcon type={app.icon} size="l" color="text" />}
                  titleSize="xs"
                  title={app.title}
                  description={app.description}
                  href={
                    (app as CardNavExtensionDefinition).skipValidation
                      ? app.href
                      : appBasePath + app.href
                  }
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
