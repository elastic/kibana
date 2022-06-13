/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiButton, EuiCard, EuiScreenReaderOnly } from '@elastic/eui';

import type { NoDataCardProps } from './types';
import { NoDataCardStyles } from './no_data_card.styles';

const defaultDescription = i18n.translate(
  'sharedUXComponents.pageTemplate.noDataCard.description',
  {
    defaultMessage: `Proceed without collecting data`,
  }
);

export const NoDataCard: FunctionComponent<NoDataCardProps> = ({
  title: titleProp,
  button,
  description,
  isDisabled,
  ...cardRest
}) => {
  const styles = NoDataCardStyles();

  const footer = () => {
    // Don't render the footer action if disabled
    if (isDisabled) {
      return;
    }
    // Render a custom footer action if the button is not a simple string
    if (button && typeof button !== 'string') {
      return button;
    }
    // Default footer action is a button with the provided or default string
    return <EuiButton fill>{button || titleProp}</EuiButton>;
  };

  const cardDescription = description || defaultDescription;

  // Fix the need for an a11y title even though the button exists by setting to screen reader only
  const title = titleProp ? (
    <EuiScreenReaderOnly>
      <span>{titleProp}</span>
    </EuiScreenReaderOnly>
  ) : null;

  return (
    <EuiCard
      css={styles}
      paddingSize="l"
      title={title!}
      description={cardDescription}
      footer={footer()}
      isDisabled={isDisabled}
      {...cardRest}
    />
  );
};
