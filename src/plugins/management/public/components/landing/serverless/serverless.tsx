/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
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

interface ManagementLandingPageProps {
  version: string;
}

const dataItems = [
  {
    id: 1,
    title: 'Ingest Pipelines',
    description:
      'Use pipelines to remove or transform fields, extract values from text, and enrich your data before indexing.',
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  {
    id: 2,
    title: 'Logstash Pipelines',
    description: 'Manage Logstash event processing and see the result visually.',
    icon: <EuiIcon size="l" type="logsApp" />,
  },
  {
    id: 3,
    title: 'Index Management',
    description: 'Update your Elasticsearch indices individually or in bulk.',
    icon: <EuiIcon size="l" type="indexManagementApp" />,
  },
  {
    id: 4,
    title: 'Transforms',
    description:
      'Transforms pivot indices into summarized, entity-centric indices, or create an indexed view of the latest documents.',
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  {
    id: 5,
    title: 'Machine Learning',
    description: 'View, export, and import machine learning analytics and anomaly detection items.',
    icon: <EuiIcon size="l" type="machineLearningApp" />,
  },
  {
    id: 6,
    title: 'Data Views',
    description:
      'Create and manage the data views that help you retrieve your data from Elasticsearch.',
    icon: <EuiIcon size="l" type="managementApp" />,
  },
];

const contentItems = [
  {
    id: 1,
    title: 'Saved Objects',
    description:
      'Manage and share your saved objects. To edit the underlying data of an object, go to its associated application.',
    icon: <EuiIcon size="l" type="savedObjectsApp" />,
  },
  {
    id: 2,
    title: 'Tags',
    description: 'Use tags to categorize and easily find your objects.',
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  {
    id: 3,
    title: 'Files',
    description: 'Any files created will be listed here.',
    icon: <EuiIcon size="l" type="indexManagementApp" />,
  },
];

const otherItems = [
  {
    id: 1,
    title: 'API Keys',
    description: 'Allow applications to access Elastic on your behalf.',
    icon: <EuiIcon size="l" type="managementApp" />,
  },
  {
    id: 2,
    title: 'Advanced Settings',
    description: 'Settings intended for advanced users.',
    icon: <EuiIcon size="l" type="logsApp" />,
  },
];

export const ServerlessLandingPage = ({ version }: ManagementLandingPageProps) => {
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
        <EuiSpacer size="l" />

        <EuiText>
          <h3>Data</h3>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGrid columns={3}>
          {dataItems.map((item) => (
            <EuiFlexItem key={item.id}>
              <EuiCard
                layout="horizontal"
                icon={item.icon}
                titleSize="xs"
                title={item.title}
                description={item.description}
                onClick={() => {}}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>

        <EuiSpacer size="s" />
        <EuiHorizontalRule />
        <EuiSpacer size="s" />
        <EuiText>
          <h3>Content</h3>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGrid columns={3}>
          {contentItems.map((item) => (
            <EuiFlexItem key={item.id}>
              <EuiCard
                layout="horizontal"
                icon={item.icon}
                titleSize="xs"
                title={item.title}
                description={item.description}
                onClick={() => {}}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>

        <EuiSpacer size="s" />
        <EuiHorizontalRule />
        <EuiSpacer size="s" />
        <EuiText>
          <h3>Other</h3>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGrid columns={3}>
          {otherItems.map((item) => (
            <EuiFlexItem key={item.id}>
              <EuiCard
                layout="horizontal"
                icon={item.icon}
                titleSize="xs"
                title={item.title}
                description={item.description}
                onClick={() => {}}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiPageSection>
    </EuiPageBody>
  );
};
