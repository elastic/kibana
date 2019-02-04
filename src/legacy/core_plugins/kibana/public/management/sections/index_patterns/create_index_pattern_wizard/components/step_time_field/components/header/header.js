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

import {
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const Header = ({
  indexPattern,
  indexPatternName,
}) => (
  <div>
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="kbn.management.createIndexPattern.stepTimeHeader"
          defaultMessage="Step 2 of 2: Configure settings"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="m"/>
    <EuiText color="subdued">
      <FormattedMessage
        id="kbn.management.createIndexPattern.stepTimeLabel"
        defaultMessage="You've defined {indexPattern} as your {indexPatternName}. Now you can specify some settings before we create it."
        values={{
          indexPattern: <strong>{indexPattern}</strong>,
          indexPatternName,
        }}
      />
    </EuiText>
  </div>
);
