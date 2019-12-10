/*
 * THIS FILE HAS BEEN MODIFIED FROM THE ORIGINAL SOURCE
 * This comment only applies to modifications applied after the e633644c43a0a0271e0b6c32c382ce1db6b413c3 commit
 *
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

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

import {
  EuiBetaBadge,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const Header = ({
  prompt,
  indexPatternName,
  showSystemIndices,
  isIncludingSystemIndices,
  onChangeIncludingSystemIndices,
  isBeta,
}) => (
  <div>
    <EuiTitle>
      <h1>
        <FormattedMessage
          id="kbn.management.createIndexPatternHeader"
          defaultMessage="Create {indexPatternName}"
          values={{
            indexPatternName,
          }}
        />
        {isBeta ? (
          <Fragment>
            {' '}
            <EuiBetaBadge
              label={i18n.translate('kbn.management.createIndexPattern.betaLabel', {
                defaultMessage: 'Beta',
              })}
            />
          </Fragment>
        ) : null}
      </h1>
    </EuiTitle>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <p>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="kbn.management.createIndexPatternLabel"
                defaultMessage="NetMon-UI uses index patterns to retrieve data from Elasticsearch indices for things like visualizations."
              />
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
      {showSystemIndices ? (
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={
              <FormattedMessage
                id="kbn.management.createIndexPattern.includeSystemIndicesToggleSwitchLabel"
                defaultMessage="Include system indices"
              />
            }
            id="checkboxShowSystemIndices"
            checked={isIncludingSystemIndices}
            onChange={onChangeIncludingSystemIndices}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
    {prompt ? (
      <Fragment>
        <EuiSpacer size="s" />
        {prompt}
      </Fragment>
    ) : null}
    <EuiSpacer size="m" />
  </div>
);
