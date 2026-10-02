/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import type { EuiCardProps } from '@elastic/eui';
import { EuiButton, EuiCard } from '@elastic/eui';
import type { NoDataPageActions } from '../no_data_page';
import { NO_DATA_RECOMMENDED } from '../no_data_page';

// Custom cards require all the props the EuiCard does
type NoDataCard = EuiCardProps & NoDataPageActions;

export const NoDataCard: FunctionComponent<NoDataPageActions> = ({
  recommended,
  title,
  button,
  layout,
  href,
  onClick,
  isDisabled,
  ...cardRest
}) => {
  const isButtonLabel = typeof button === 'string';

  // A string `button` renders a real EuiButton in the footer, so href/onClick/isDisabled
  // must live on it instead of the card: a card-level href/onClick would make the whole
  // card an interactive wrapper around that button, which is invalid, doubly-focusable
  // nesting (@elastic/eui/no-nested-interactive-element). A custom `button` node or no
  // button at all keeps the card itself as the sole control, same as before.
  const footer = isButtonLabel ? (
    <EuiButton fill href={href} onClick={onClick} isDisabled={isDisabled}>
      {button || title}
    </EuiButton>
  ) : (
    button
  );

  return (
    <EuiCard
      paddingSize="l"
      // TODO: we should require both title and description to be passed in by consumers since defaults are not adequate.
      // see comment: https://github.com/elastic/kibana/pull/111261/files#r708399140
      title={title!}
      description={i18n.translate('kibana-react.noDataPage.noDataCard.description', {
        defaultMessage: `Proceed without collecting data`,
      })}
      betaBadgeProps={recommended ? { label: NO_DATA_RECOMMENDED } : undefined}
      footer={footer}
      layout={layout as 'vertical' | undefined}
      isDisabled={isDisabled}
      {...(isButtonLabel ? undefined : { href, onClick })}
      {...cardRest}
    />
  );
};
