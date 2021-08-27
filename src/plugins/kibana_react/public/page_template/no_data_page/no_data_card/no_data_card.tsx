/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EuiCardProps } from '@elastic/eui';
import { EuiButton, EuiCard } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import type { NoDataPageActions } from '../no_data_page';
import { NO_DATA_RECOMMENDED } from '../no_data_page';

// Custom cards require all the props the EuiCard does
type NoDataCard = EuiCardProps & NoDataPageActions;

export const NoDataCard: FunctionComponent<NoDataPageActions> = ({
  recommended,
  title,
  button,
  ...cardRest
}) => {
  const footer =
    typeof button !== 'string' ? button : <EuiButton fill>{button || title}</EuiButton>;

  return (
    <EuiCard
      paddingSize="l"
      title={title}
      betaBadgeLabel={recommended ? NO_DATA_RECOMMENDED : undefined}
      footer={footer}
      {...(cardRest as any)}
    />
  );
};
