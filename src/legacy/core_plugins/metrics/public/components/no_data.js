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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';

export function NoDataComponent() {
  return (
    <div className="visError" data-test-subj="noTSVBDataMessage">
      <EuiText size="xs" color="subdued">
        <EuiIcon type="visualizeApp" size="m" color="subdued" aria-hidden="true" />

        <EuiSpacer size="s" />

        <p>
          <FormattedMessage
            id="tsvb.noDataDescription"
            defaultMessage="No data to display for the selected metrics"
          />
        </p>
      </EuiText>
    </div>
  );
}
