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

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { DataPublicPluginStart } from '../../types';

interface Props {
  data?: DataPublicPluginStart;
}

export function LongQueryNotification(props: Props) {
  const { data } = props;
  const [actionsDisabled] = useState(!data?.search.isAsyncEnabled());
  return (
    <div>
      <FormattedMessage
        id="data.query.queryBar.longQueryMessage"
        defaultMessage="Seems like a query is taking a long time. {link}."
        values={{
          link: (
            <EuiLink href="http://www.why.com" target="_blank">
              <FormattedMessage
                id="data.query.queryBar.syntaxOptionsDescription.learnMore"
                defaultMessage="Learn more"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            disabled={actionsDisabled}
            onClick={() => {
              if (data) {
                data.search.cancel();
              }
            }}
          >
            <FormattedMessage id="data.query.queryBar.cancelLongQuery" defaultMessage="Cancel" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            disabled={actionsDisabled}
            onClick={() => {
              if (data) {
                data.search.runBeyondTimeout();
              }
            }}
          >
            <FormattedMessage
              id="data.query.queryBar.runBeyond"
              defaultMessage="Run beyond timeout"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
