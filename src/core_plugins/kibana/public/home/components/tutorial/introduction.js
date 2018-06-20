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
} from '@elastic/eui';

export function Introduction({ description, previewUrl, title, exportedFieldsUrl, iconType }) {
  let img;
  if (previewUrl) {
    img = (
      <EuiImage
        size="l"
        hasShadow
        allowFullScreen
        fullScreenIconColor="dark"
        alt="screenshot of primary dashboard."
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
          rel="noopener noreferrer"
        >
          View exported fields
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
  return (
    <EuiFlexGroup>

      <EuiFlexItem>
        <EuiTitle size="l">
          <h2>
            {icon}
            {title}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <Content text={description} />
        {exportedFields}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {img}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

Introduction.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  previewUrl: PropTypes.string,
  exportedFieldsUrl: PropTypes.string,
  iconType: PropTypes.string,
};
