/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FormattedStatus } from '../lib';

interface ServerStateProps {
  name: string;
  serverState: FormattedStatus['state'];
}

export const ServerStatus: FunctionComponent<ServerStateProps> = ({ name, serverState }) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" style={{ flexGrow: 0 }}>
    <EuiFlexItem grow={false}>
      <EuiTitle>
        <h2 data-test-subj="serverStatusTitle">
          <FormattedMessage
            id="core.statusPage.serverStatus.statusTitle"
            defaultMessage="Kibana status is {kibanaStatus}"
            values={{
              kibanaStatus: (
                <EuiBadge
                  data-test-subj="serverStatusTitleBadge"
                  color={serverState.uiColor}
                  aria-label={serverState.title}
                >
                  {serverState.title}
                </EuiBadge>
              ),
            }}
          />
        </h2>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText>
        <p>{name}</p>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
