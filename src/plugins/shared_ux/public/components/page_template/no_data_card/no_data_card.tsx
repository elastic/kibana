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
import { NoDataPageActions } from './types';

const NO_DATA_RECOMMENDED = i18n.translate('sharedUX.noDataPage.noDataPage.recommended', {
  defaultMessage: 'Recommended',
});

const defaultDescription = i18n.translate('kibana-react.noDataPage.noDataCard.description', {
  defaultMessage: `Proceed without collecting data`,
});

export const NoDataCard: FunctionComponent<NoDataPageActions> = ({
  recommended,
  title,
  button,
  description,
  ...cardRest
}) => {
  const footer = () => {
    if (typeof button !== 'string') {
      return button;
    }
    return <EuiButton fill>{button || title}</EuiButton>;
  };
  const label = recommended ? NO_DATA_RECOMMENDED : undefined;
  const cardDescription = description || defaultDescription;

  return (
    <EuiCard
      paddingSize="l"
      // TODO: we should require both title and description to be passed in by consumers since defaults are not adequate.
      // see comment: https://github.com/elastic/kibana/pull/111261/files#r708399140
      title={title!}
      description={cardDescription}
      betaBadgeProps={{ label }}
      footer={footer()}
      {...cardRest}
    />
  );
};
