/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiButton, EuiCard } from '@elastic/eui';
import type { NoDataCardProps } from './types';

const recommendedLabel = i18n.translate('sharedUX.pageTemplate.noDataPage.recommendedLabel', {
  defaultMessage: 'Recommended',
});

const defaultDescription = i18n.translate('sharedUX.pageTemplate.noDataCard.description', {
  defaultMessage: 'Proceed without collecting data',
});

export const NoDataCard: FunctionComponent<NoDataCardProps> = ({
  recommended,
  title,
  button,
  description,
  renderFooter,
  ...cardRest
}) => {
  const footer = () => {
    if (button && typeof button !== 'string') {
      return button;
    }
    if (!button && !renderFooter) {
      return button;
    }
    return <EuiButton fill>{button || title}</EuiButton>;
  };
  const label = recommended ? recommendedLabel : undefined;
  const cardDescription = description || defaultDescription;

  return (
    <EuiCard
      paddingSize="l"
      title={title!}
      description={cardDescription}
      betaBadgeProps={{ label }}
      footer={footer()}
      {...cardRest}
    />
  );
};
