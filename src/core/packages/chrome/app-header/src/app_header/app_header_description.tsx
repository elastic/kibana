/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderDescription as AppHeaderDescriptionConfig } from '../types';

const learnMoreLinkText = i18n.translate('core.ui.chrome.appHeader.description.learnMoreLinkText', {
  defaultMessage: 'Learn more',
});

export const AppHeaderDescription = React.memo<{
  description: AppHeaderDescriptionConfig;
}>(({ description }) => {
  const text = typeof description === 'string' ? description : description.text;
  const learnMoreUrl = typeof description === 'string' ? undefined : description.learnMoreUrl;

  return (
    <EuiText
      color="subdued"
      css={css`
        max-inline-size: 80ch;
      `}
      size="xs"
    >
      <p>
        {text}
        {learnMoreUrl && (
          <>
            {' '}
            <EuiLink external href={learnMoreUrl} target="_blank">
              {learnMoreLinkText}
            </EuiLink>
          </>
        )}
      </p>
    </EuiText>
  );
});

AppHeaderDescription.displayName = 'AppHeaderDescription';
