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

import { FormattedMessage } from 'react-intl';
import { EuiLink } from '@elastic/eui';

export function SplitTooltip() {
  return (
    <FormattedMessage
      id="visTypeXy.splitChartWarning.content"
      defaultMessage={`Split chart aggregations are not supported with new chart ui enabled. Please disable the "New Chart Ui" advanced setting to enable split chart support.`}
    />
  );
}
