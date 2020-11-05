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

import React, { FC } from 'react';

import { EuiLink, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const SplitChartWarning: FC = () => {
  return (
    <EuiCallOut
      title={i18n.translate('visTypeXy.splitChartWarning.title', {
        defaultMessage: 'Warning',
      })}
      color="warning"
      iconType="help"
    >
      <FormattedMessage
        id="visTypeXy.splitChartWarning.content"
        defaultMessage="Split chart aggregation is not supported with the new charts library. Please disable the {link} advanced setting to enable split chart aggregation."
        values={{
          link: (
            <EuiLink
              href="/app/management/kibana/settings/charts%20library"
              target="_blank"
              external
            >
              <FormattedMessage
                id="visTypeXy.splitChartWarning.link"
                defaultMessage="Charts library"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
