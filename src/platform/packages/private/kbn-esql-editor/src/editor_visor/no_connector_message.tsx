/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiFlexGroup, EuiIcon, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

const CONNECTORS_PATH = '/app/management/modelManagement/model_settings';

interface NoConnectorMessageProps {
  basePath: { prepend: (path: string) => string };
}

export function NoConnectorMessage({ basePath }: NoConnectorMessageProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={css`
        padding: 0 ${euiTheme.size.s};
      `}
      data-test-subj="esqlVisorNoConnectorMessage"
    >
      <EuiIcon type="warning" color="warning" size="s" aria-hidden={true} />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="esqlEditor.visor.noConnectorMessage"
          defaultMessage="You need to {link} to enable this."
          values={{
            link: (
              <EuiLink href={basePath.prepend(CONNECTORS_PATH)}>
                <FormattedMessage
                  id="esqlEditor.visor.setupConnectorLink"
                  defaultMessage="setup a connector"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiFlexGroup>
  );
}
