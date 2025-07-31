/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiPageTemplate, EuiTitle, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NoDataCardComponentProps as Props } from '@kbn/shared-ux-card-no-data-types';
import { ElasticAgentCardIllustration } from './elastic_agent_card_illustration';

const defaultTitle = i18n.translate('sharedUXPackages.card.noData.title', {
  defaultMessage: 'Add Data to get started',
});

const defaultDescription = i18n.translate('sharedUXPackages.card.noData.description', {
  defaultMessage: `Browse integration options to find the best way to add your data and start analyzing.`,
});

const defaultButton = i18n.translate('sharedUXPackages.card.noData.buttonLabel', {
  defaultMessage: 'Browse integrations',
});

const noPermissionTitle = i18n.translate('sharedUXPackages.card.noData.noPermission.title', {
  defaultMessage: 'Contact your administrator',
});

const noPermissionDescription = i18n.translate(
  'sharedUXPackages.card.noData.noPermission.description',
  {
    defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
  }
);

export const NoDataCard = ({
  title,
  description,
  canAccessFleet,
  href,
  button,
  docsLink: link,
  onClick,
  icon,
}: Props) => {
  const cardIcon = icon ? icon : <ElasticAgentCardIllustration />;
  const docsLink = link || 'https://www.elastic.co/kibana';
  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="noDataCard"
      style={{ maxWidth: 400 }} // Adjust max width as needed
      title={
        <EuiTitle size="m">
          <h2>{canAccessFleet ? title || defaultTitle : noPermissionTitle}</h2>
        </EuiTitle>
      }
      icon={cardIcon}
      body={<p>{canAccessFleet ? description || defaultDescription : noPermissionDescription}</p>}
      actions={
        canAccessFleet && href ? (
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiButton
            color="primary"
            fill
            href={href}
            data-test-subj="noDataDefaultFooterAction"
            onClick={onClick}
          >
            {button || defaultButton}
          </EuiButton>
        ) : undefined
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('sharedUXPackages.card.noData.learnMore', {
                defaultMessage: 'Want to learn more?',
              })}
            </span>
          </EuiTitle>{' '}
          <EuiLink href={docsLink} target="_blank">
            {i18n.translate('sharedUXPackages.card.noData.readDocs', {
              defaultMessage: 'Read the docs',
            })}
          </EuiLink>
        </>
      }
    />
  );
};
