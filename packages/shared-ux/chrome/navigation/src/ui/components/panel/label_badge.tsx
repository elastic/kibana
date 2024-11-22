/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiBetaBadge, useEuiTheme } from '@elastic/eui';

export const BETA_LABEL = i18n.translate('sharedUXPackages.chrome.sideNavigation.betaBadge.label', {
  defaultMessage: 'Beta',
});

export const LabelBadge = ({
  text = BETA_LABEL,
  className,
}: {
  /** Optional text for the badge. @default 'Beta' */
  text?: string;
  className?: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBetaBadge
      label={text}
      size="s"
      css={css`
        margin-left: ${euiTheme.size.s};
        color: ${euiTheme.colors.text};
        vertical-align: middle;
        margin-bottom: ${euiTheme.size.xxs};
      `}
      className={className}
    />
  );
};
