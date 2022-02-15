/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';

interface Props {
  documentationUrl: string;
}

export function DocumentationLink({ documentationUrl }: Props) {
  const { euiTheme } = useEuiTheme();
  const { colors, size, border } = euiTheme;
  const titleCSS = css`
    width: auto !important;
  `;
  const footerCSS = css`
    background: ${colors.lightestShade};
    margin: 0 (-${size.l}) (-${size.l});
    padding: ${size.l};
    border-radius: 0 0 ${border.radius.medium} ${border.radius.medium};
    align-items: baseline !important;
  `;
  return (
    <EuiDescriptionList className={footerCSS} type="responsiveColumn">
      <EuiDescriptionListTitle className={titleCSS}>
        <FormattedMessage
          id="sharedUX.noDataViews.learnMore"
          defaultMessage="Want to learn more?"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiLink href={documentationUrl} target="_blank" external>
          <FormattedMessage
            id="sharedUX.noDataViews.readDocumentation"
            defaultMessage="Read documentation"
          />
        </EuiLink>
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}
