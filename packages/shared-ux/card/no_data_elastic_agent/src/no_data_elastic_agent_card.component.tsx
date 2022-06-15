/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiImage, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NoDataCard, NoDataCardProps } from '@kbn/shared-ux-card-no-data';

import ElasticAgentCardIllustration from './assets/elastic_agent_card.svg';

export type Props = NoDataCardProps & {
  /** Category to auto-select within Fleet */
  category?: string;
  /** True if the person can access Fleet, false otherwise */
  canAccessFleet: boolean;
};

const noPermissionTitle = i18n.translate(
  'sharedUXPackages.card.noDataElasticAgent.noPermission.title',
  {
    defaultMessage: `Contact your administrator`,
  }
);

const noPermissionDescription = i18n.translate(
  'sharedUXPackages.card.noDataElasticAgent.noPermission.description',
  {
    defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
  }
);

const elasticAgentCardTitle = i18n.translate('sharedUXPackages.card.noDataElasticAgent.title', {
  defaultMessage: 'Add Elastic Agent',
});

const elasticAgentCardDescription = i18n.translate(
  'sharedUXPackages.card.noDataElasticAgent.description',
  {
    defaultMessage: `Use Elastic Agent for a simple, unified way to collect data from your machines.`,
  }
);

/**
 * Creates a specific NoDataCard pointing users to Integrations when `canAccessFleet`
 */
export const NoDataElasticAgentCard = ({
  canAccessFleet,
  title = elasticAgentCardTitle,
  description,
  ...props
}: Props) => {
  const cardProps = canAccessFleet
    ? {
        title,
        description: description || elasticAgentCardDescription,
      }
    : {
        title: <EuiTextColor color="default">{noPermissionTitle}</EuiTextColor>,
        description: <EuiTextColor color="default">{noPermissionDescription}</EuiTextColor>,
        isDisabled: true,
      };

  const image = (
    <EuiImage
      size="fullWidth"
      style={{
        width: 'max(100%, 360px)',
        height: 240,
        objectFit: 'cover',
        background: 'aliceblue',
      }}
      url={ElasticAgentCardIllustration}
      alt=""
    />
  );

  return <NoDataCard image={image} {...props} {...cardProps} />;
};
