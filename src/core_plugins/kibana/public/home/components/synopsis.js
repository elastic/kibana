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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiIcon,
} from '@elastic/eui';

export function Synopsis({ description, iconUrl, iconType, title, url, wrapInPanel, onClick, isBeta }) {
  let optionalImg;
  if (iconUrl) {
    optionalImg = (
      <EuiFlexItem grow={false}>
        <img
          className="synopsisIcon"
          src={iconUrl}
          alt=""
        />
      </EuiFlexItem>
    );
  } else if (iconType) {
    optionalImg = (
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={iconType}
          color="primary"
          size="xl"
        />
      </EuiFlexItem>
    );
  }

  const content = (
    <EuiFlexGroup>
      {optionalImg}
      <EuiFlexItem className="synopsisContent">
        <EuiTitle size="s" className="synopsisTitle">
          <h4>
            {title}
          </h4>
        </EuiTitle>
        <EuiText className="synopsisBody">
          <p>
            <EuiTextColor color="subdued">
              {description}
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  let synopsisDisplay = content;
  if (wrapInPanel) {
    synopsisDisplay = (
      <EuiPanel className="synopsisPanel" betaBadgeLabel={isBeta ? 'BETA' : null}>
        {content}
      </EuiPanel>
    );
  }

  if (onClick) {
    return (
      <span
        onClick={onClick}
        className="euiLink synopsis"
        data-test-subj={`homeSynopsisLink${title.toLowerCase()}`}
      >
        {synopsisDisplay}
      </span>
    );
  }

  return (
    <a
      href={url}
      className="euiLink synopsis"
      data-test-subj={`homeSynopsisLink${title.toLowerCase()}`}
    >
      {synopsisDisplay}
    </a>
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  iconUrl: PropTypes.string,
  iconType: PropTypes.string,
  title: PropTypes.string.isRequired,
  url: PropTypes.string,
  onClick: PropTypes.func,
  isBeta: PropTypes.bool,
};

Synopsis.defaultProps = {
  isBeta: false
};
