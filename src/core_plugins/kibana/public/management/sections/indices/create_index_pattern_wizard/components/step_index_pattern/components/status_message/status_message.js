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
  EuiText,
  EuiTextColor,
  EuiIcon,
} from '@elastic/eui';

export const StatusMessage = ({
  matchedIndices: {
    allIndices = [],
    exactMatchedIndices = [],
    partialMatchedIndices = []
  },
  isIncludingSystemIndices,
  query,
}) => {
  let statusIcon;
  let statusMessage;
  let statusColor;

  if (query.length === 0) {
    statusIcon = null;
    statusColor = 'default';

    if (allIndices.length > 1) {
      statusMessage = (
        <span>
          Your index pattern can match any of your <strong>{allIndices.length} indices</strong>, below.
        </span>
      );
    }
    else if (!isIncludingSystemIndices) {
      statusMessage = (
        <span>
          No Elasticsearch indices match your pattern. To view the matching system indices, toggle the switch in the upper right.
        </span>
      );
    }
    else {
      // This should never really happen but let's handle it just in case
      statusMessage = (
        <span>
          No Elasticsearch indices match your pattern.
        </span>
      );
    }
  }
  else if (exactMatchedIndices.length) {
    statusIcon = 'check';
    statusColor = 'secondary';
    statusMessage = (
      <span>
        &nbsp;
        <strong>Success!</strong>
        &nbsp;
        Your index pattern matches <strong>{exactMatchedIndices.length} {exactMatchedIndices.length > 1 ? 'indices' : 'index'}</strong>.
      </span>
    );
  }
  else if (partialMatchedIndices.length) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        Your index pattern doesn&apos;t match any indices, but you have&nbsp;
        <strong>
          {partialMatchedIndices.length} {partialMatchedIndices.length > 1 ? 'indices ' : 'index '}
        </strong>
        which {partialMatchedIndices.length > 1 ? 'look' : 'looks'} similar.
      </span>
    );
  }
  else if (allIndices.length) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        The index pattern you&apos;ve entered doesn&apos;t match any indices.
        You can match any of your <strong>{allIndices.length} indices</strong>, below.
      </span>
    );
  }

  return (
    <EuiText size="s">
      <EuiTextColor color={statusColor}>
        { statusIcon ? <EuiIcon type={statusIcon}/> : null }
        {statusMessage}
      </EuiTextColor>
    </EuiText>
  );
};
