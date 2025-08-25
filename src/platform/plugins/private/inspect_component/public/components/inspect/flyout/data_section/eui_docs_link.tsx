/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiData } from '../../../../lib/eui/get_eui_component_docs_data';

interface Props {
  euiData?: EuiData;
}

export const EuiDocsLink = ({ euiData }: Props) => {
  const { euiTheme } = useEuiTheme();

  const boldTextCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiText css={boldTextCss} size="s">
        <FormattedMessage
          id="kbnInspectComponent.inspectFlyout.dataSectioneuiDocsLabel"
          defaultMessage="EUI Docs:"
        />
      </EuiText>
      {euiData ? (
        <EuiLink href={euiData.docsLink} target="_blank" external>
          {euiData.componentName}
        </EuiLink>
      ) : (
        <EuiText size="s">
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.dataSection.noDocsFound"
            defaultMessage="N/A"
          />
        </EuiText>
      )}
    </EuiFlexGroup>
  );
};
