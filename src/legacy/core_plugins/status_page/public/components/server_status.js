/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { State as StatePropType } from '../lib/prop_types';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const ServerState = ({
  name,
  serverState
}) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="spaceBetween"
    style={{ flexGrow: 0 }}
  >
    <EuiFlexItem grow={false}>
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="statusPage.serverStatus.statusTitle"
            defaultMessage="Kibana status is {kibanaStatus}"
            values={{
              kibanaStatus: (
                <EuiBadge color={serverState.uiColor}>
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
        <p>
          {name}
        </p>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

ServerState.propTypes = {
  name: PropTypes.string.isRequired,
  serverState: StatePropType.isRequired
};

export default ServerState;
