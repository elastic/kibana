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
import { Content } from './content';
import {
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiImage,
  EuiButton,
  EuiIcon,
  EuiBetaBadge,
} from '@elastic/eui';

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function IntroductionUI({ description, previewUrl, title, exportedFieldsUrl, iconType, isBeta, intl }) {
  let img;
  if (previewUrl) {
    img = (
      <EuiImage
        size="l"
        hasShadow
        allowFullScreen
        fullScreenIconColor="dark"
        alt={intl.formatMessage({
          id: 'kbn.home.tutorial.introduction.imageAltDescription',
          defaultMessage: 'screenshot of primary dashboard.'
        })}
        url={previewUrl}
      />
    );
  }
  let exportedFields;
  if (exportedFieldsUrl) {
    exportedFields = (
      <div>
        <EuiSpacer />
        <EuiButton
          href={exportedFieldsUrl}
          target="_blank"
          rel="noopener"
        >
          <FormattedMessage id="kbn.home.tutorial.introduction.viewButtonLabel" defaultMessage="View exported fields"/>
        </EuiButton>
      </div>
    );
  }
  let icon;
  if (iconType) {
    icon = (
      <EuiIcon
        type={iconType}
        size="xl"
        style={{ marginRight: 16 }}
      />
    );
  }
  let betaBadge;
  if (isBeta) {
    betaBadge = (
      <EuiBetaBadge
        label={intl.formatMessage({
          id: 'kbn.home.tutorial.introduction.betaLabel',
          defaultMessage: 'Beta'
        })}
      />
    );
  }
  return (
    <EuiFlexGroup>

      <EuiFlexItem>

        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            {icon}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2>
                {title} &nbsp;
                {betaBadge}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <Content text={description} />
        {exportedFields}

      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {img}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

IntroductionUI.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  previewUrl: PropTypes.string,
  exportedFieldsUrl: PropTypes.string,
  iconType: PropTypes.string,
  isBeta: PropTypes.bool,
};

IntroductionUI.defaultProps = {
  isBeta: false
};

export const Introduction = injectI18n(IntroductionUI);
