/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiCard, EuiScreenReaderOnly, EuiTextColor, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NoDataCardComponentProps as Props } from '@kbn/shared-ux-card-no-data-types';

import { NoDataCardStyles } from './no_data_card.styles';
import ElasticAgentCardIllustration from './assets/elastic_agent_card.svg';

const noPermissionTitle = i18n.translate('sharedUXPackages.card.noData.noPermission.title', {
  defaultMessage: `Contact your administrator`,
});

const noPermissionDescription = i18n.translate(
  'sharedUXPackages.card.noData.noPermission.description',
  {
    defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
  }
);

const defaultTitle = i18n.translate('sharedUXPackages.card.noData.title', {
  defaultMessage: 'Add Elastic Agent',
});

const defaultDescription = i18n.translate('sharedUXPackages.card.noData.description', {
  defaultMessage: `Use Elastic Agent for a simple, unified way to collect data from your machines.`,
});

const Image = () => (
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

/**
 * Creates a specific NoDataCard pointing users to Integrations when `canAccessFleet`
 */
export const NoDataCard = ({
  title: titleProp,
  description: descriptionProp,
  canAccessFleet,
  button,
  ...props
}: Props) => {
  const styles = NoDataCardStyles();

  const footer = () => {
    // Don't render the footer action if disabled
    if (!canAccessFleet) {
      return;
    }

    // Render a custom footer action if the button is not a simple string
    if (button && typeof button !== 'string') {
      return button;
    }

    // Default footer action is a button with the provided or default string
    return <EuiButton fill>{button || titleProp || defaultTitle}</EuiButton>;
  };

  const title = () => {
    if (!canAccessFleet) {
      return <EuiTextColor color="default">{noPermissionTitle}</EuiTextColor>;
    }

    return (
      <EuiScreenReaderOnly>
        <span>{titleProp || defaultTitle}</span>
      </EuiScreenReaderOnly>
    );
  };

  const description = () => {
    if (!canAccessFleet) {
      return <EuiTextColor color="default">{noPermissionDescription}</EuiTextColor>;
    }

    return descriptionProp || defaultDescription;
  };

  return (
    <EuiCard
      css={styles}
      paddingSize="l"
      title={title()}
      description={description()}
      footer={footer()}
      isDisabled={!canAccessFleet}
      image={<Image />}
      {...props}
    />
  );
};
