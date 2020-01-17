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

import React, { Fragment } from 'react';
import { getDocLink } from 'ui/documentation_links';

import { EuiCallOut, EuiIcon, EuiLink, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const ScriptingWarningCallOut = ({ isVisible = false }) => {
  return isVisible ? (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="common.ui.fieldEditor.warningCallOutHeader"
            defaultMessage="Proceed with caution"
          />
        }
        color="warning"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="common.ui.fieldEditor.warningCallOutLabel.callOutDetail"
            defaultMessage="Please familiarize yourself with {scripFields} and with {scriptsInAggregation} before using scripted fields."
            values={{
              scripFields: (
                <EuiLink target="_blank" href={getDocLink('scriptedFields.scriptFields')}>
                  <FormattedMessage
                    id="common.ui.fieldEditor.warningCallOutLabel.scripFieldsLink"
                    defaultMessage="script fields"
                  />
                  &nbsp;
                  <EuiIcon type="link" />
                </EuiLink>
              ),
              scriptsInAggregation: (
                <EuiLink target="_blank" href={getDocLink('scriptedFields.scriptAggs')}>
                  <FormattedMessage
                    id="common.ui.fieldEditor.warningCallOutLabel.scriptsInAggregationLink"
                    defaultMessage="scripts in aggregations"
                  />
                  &nbsp;
                  <EuiIcon type="link" />
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="common.ui.fieldEditor.warningCallOut.descriptionLabel"
            defaultMessage="Scripted fields can be used to display and aggregate calculated values. As such, they can be very slow, and
            if done incorrectly, can cause Kibana to be unusable. There's no safety net here. If you make a typo, unexpected exceptions
            will be thrown all over the place!"
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  ) : null;
};

ScriptingWarningCallOut.displayName = 'ScriptingWarningCallOut';
