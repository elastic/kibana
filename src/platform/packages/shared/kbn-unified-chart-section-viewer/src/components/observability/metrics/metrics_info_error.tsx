/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/**
 * METRICS_INFO failure state. Layout aligned with Discover’s `ErrorCallout` (EuiEmptyPrompt):
 * icon on top, bordered card, title + description (fixed copy — not the raw error message).
 */

// TODO #261332: https://github.com/elastic/kibana/issues/261332
export const MetricsInfoError = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiEmptyPrompt
      data-test-subj="metricsInfoError"
      icon={<EuiIcon size="l" type="error" color="danger" aria-hidden={true} />}
      color="plain"
      paddingSize="m"
      hasBorder
      titleSize="xs"
      title={
        <h2 data-test-subj="metricsInfoErrorTitle">
          {i18n.translate('metricsExperience.metricsInfoError.title', {
            defaultMessage: 'Unable to load visualization',
          })}
        </h2>
      }
      body={
        <EuiText size="s" textAlign="center" data-test-subj="metricsInfoErrorDescription">
          {i18n.translate('metricsExperience.metricsInfoError.description', {
            defaultMessage:
              "We're having some trouble retrieving the information needed for this visualization right now. Please wait a few moments or try refreshing the page.",
          })}
        </EuiText>
      }
      css={css`
        margin: ${euiTheme.size.xl} auto;
      `}
    />
  );
};
