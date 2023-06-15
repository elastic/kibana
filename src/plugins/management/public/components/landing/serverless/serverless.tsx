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
  EuiIcon,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ManagementSection, ManagementApp } from '../../../utils';

interface ManagementLandingPageProps {
  sections: ManagementSection[];
  appBasePath: string;
}

const getDataFromManagementApp = (section: ManagementApp) => {
  return {
    id: section.id,
    title: section.title,
    href: section.basePath,
  };
};

const getEnabledAppsByCategory = (sections: ManagementSection[]) => {
  // Flatten all apps into a single array
  const flattenApps = flatMap(sections, (section) => section.apps);
  // Filter out apps that are not enabled and create an object with the
  // app id as the key so we can easily do app look up by id.
  const filteredApps: { [key: string]: any } = flattenApps.reduce((obj, item: ManagementApp) => {
    return item.enabled ? { ...obj, [item.id]: item } : obj;
  }, {});

  return [
    {
      id: 'data',
      title: 'Data',
      apps: [
        {
          ...getDataFromManagementApp(filteredApps.ingest_pipelines),
          description:
            'Use pipelines to remove or transform fields, extract values from text, and enrich your data before indexing.',
          icon: <EuiIcon size="l" type="managementApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.pipelines),
          description: 'Manage Logstash event processing and see the result visually.',
          icon: <EuiIcon size="l" type="logsApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.index_management),
          description: 'Update your Elasticsearch indices individually or in bulk.',
          icon: <EuiIcon size="l" type="indexManagementApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.transform),
          description:
            'Transforms pivot indices into summarized, entity-centric indices, or create an indexed view of the latest documents.',
          icon: <EuiIcon size="l" type="managementApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.jobsListLink),
          description:
            'View, export, and import machine learning analytics and anomaly detection items.',
          icon: <EuiIcon size="l" type="machineLearningApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.dataViews),
          description:
            'Create and manage the data views that help you retrieve your data from Elasticsearch.',
          icon: <EuiIcon size="l" type="managementApp" />,
        },
      ],
    },
    {
      id: 'content',
      title: 'Content',
      apps: [
        {
          ...getDataFromManagementApp(filteredApps.objects),
          description:
            'Manage and share your saved objects. To edit the underlying data of an object, go to its associated application.',
          icon: <EuiIcon size="l" type="savedObjectsApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.tags),
          description: 'Use tags to categorize and easily find your objects.',
          icon: <EuiIcon size="l" type="managementApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.filesManagement),
          description: 'Any files created will be listed here.',
          icon: <EuiIcon size="l" type="indexManagementApp" />,
        },
      ],
    },
    {
      id: 'other',
      title: 'Other',
      apps: [
        {
          ...getDataFromManagementApp(filteredApps.api_keys),
          description: 'Allow applications to access Elastic on your behalf.',
          icon: <EuiIcon size="l" type="managementApp" />,
        },
        {
          ...getDataFromManagementApp(filteredApps.settings),
          description: 'Settings intended for advanced users.',
          icon: <EuiIcon size="l" type="logsApp" />,
        },
      ],
    },
  ];
};

export const ServerlessLandingPage = ({ sections, appBasePath }: ManagementLandingPageProps) => {
  const appsByCategory = getEnabledAppsByCategory(sections);

  return (
    <EuiPageBody restrictWidth={true}>
      <EuiPageSection color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18n.translate('management.landing.serverless.pageTitle', {
            defaultMessage: 'Management',
          })}
          description={i18n.translate('management.landing.serverless.pageDescription', {
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
                <EuiFlexItem key={app.id}>
                  <EuiCard
                    layout="horizontal"
                    icon={app.icon}
                    titleSize="xs"
                    title={app.title}
                    description={app.description}
                    href={appBasePath + app.href}
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
