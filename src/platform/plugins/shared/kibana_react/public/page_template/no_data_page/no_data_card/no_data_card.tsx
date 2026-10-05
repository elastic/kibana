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
  target,
  rel,
  ...cardRest
}) => {
  const isButtonLabel = typeof button === 'string';

  // A string `button` renders a real EuiButton in the footer, so href/onClick/isDisabled/
  // target/rel live on it instead of the card. A custom `button` node is rendered as-is
  // and owns its own interactivity, so the card gets none of those either — in both cases,
  // card-level href/onClick alongside a footer control would make the whole card an
  // interactive wrapper around it, which is invalid, doubly-focusable nesting
  // (@elastic/eui/no-nested-interactive-element). Only when there is no button at all does
  // the card remain the sole interactive control, same as before.
  const footer = isButtonLabel ? (
    <EuiButton fill href={href} onClick={onClick} isDisabled={isDisabled} target={target} rel={rel}>
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
      {...(button == null ? { href, onClick, target, rel } : undefined)}
      {...cardRest}
    />
  );
};
